import { parseImageToken, type ImageToken } from '@/shared/utils/imageTokens'
import { OVERVIEW_ID } from './tocNavigation'

export type Delta = 'buff' | 'nerf' | 'rework'
export type Rarity = 'mythic' | 'epic' | 'rare' | 'common'
type Marker = Delta | Rarity | 'new'

const RARITIES = new Set<string>(['mythic', 'epic', 'rare', 'common'])

interface MdData {
    hName?: string
    hProperties?: Record<string, unknown>
}

interface MdPoint {
    line: number
}

export interface MdNode {
    type: string
    depth?: number
    value?: string
    ordered?: boolean | null
    start?: number | null
    spread?: boolean | null
    children?: MdNode[]
    data?: MdData
    position?: { start: MdPoint; end: MdPoint }
}

export interface ToggleRange {
    start: number
    end: number
}

const TOGGLE_START = /^>[ \t]*(?=#{1,6}(?:[ \t]|$))/
const TITLE_HEADING_LINE = /^ {0,3}#{1,3}(?:[ \t]|$)/
const FENCE = /^[ \t]*(`{3,}|~{3,})/

function fencedLines(lines: string[]): boolean[] {
    const fenced: boolean[] = []
    let open: { char: string; size: number } | null = null
    for (const line of lines) {
        const m = FENCE.exec(line)
        if (open) {
            fenced.push(true)
            if (m && m[1][0] === open.char && m[1].length >= open.size && line.slice(m[0].length).trim() === '') open = null
            continue
        }
        if (m) open = { char: m[1][0], size: m[1].length }
        fenced.push(!!m)
    }
    return fenced
}

export function prepareChangelog(body: string): { source: string; toggles: ToggleRange[] } {
    const parts = body.split(/(\r\n|\r|\n)/)
    const lines: string[] = []
    const endings: string[] = []
    for (let i = 0; i < parts.length; i += 2) {
        lines.push(parts[i])
        endings.push(parts[i + 1] ?? '')
    }

    const fenced = fencedLines(lines)
    const isStart = lines.map((line, i) => !fenced[i] && TOGGLE_START.test(line))

    const toggles: ToggleRange[] = []
    for (let i = 0; i < lines.length; i++) {
        if (!isStart[i]) continue
        let end = i
        while (end + 1 < lines.length) {
            const j = end + 1
            const stops = isStart[j] || lines[j].trim() === '' || TITLE_HEADING_LINE.test(lines[j])
            if (!fenced[j] && stops) break
            end = j
        }
        toggles.push({ start: i + 1, end: end + 1 })
    }

    const source = lines
        .map((line, i) => (isStart[i] ? line.replace(TOGGLE_START, '') : line) + endings[i])
        .join('')
    return { source, toggles }
}

const MARKER_PREFIX = /^\s*\[(buff|nerf|rework|new|mythic|epic|rare|common)\]\s*/i

export function slugBase(text: string): string {
    const slug = text
        .toLowerCase()
        .normalize('NFC')
        .replace(/[^\p{L}\p{N}\s-]/gu, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
    return slug || 'section'
}

function createSlugger() {
    const seen = new Map<string, number>([[OVERVIEW_ID, 1]])
    return (text: string) => {
        const base = slugBase(text)
        const count = (seen.get(base) ?? 0) + 1
        seen.set(base, count)
        return count === 1 ? base : `${base}-${count}`
    }
}

export function textOf(node: MdNode): string {
    if (typeof node.value === 'string') return node.value
    return (node.children ?? []).map(textOf).join('')
}

function setProperties(node: MdNode, props: Record<string, unknown>) {
    node.data = { ...node.data, hProperties: { ...node.data?.hProperties, ...props } }
}

const PHRASING_PARENTS = new Set(['paragraph', 'heading', 'tableCell'])

function markerNode(marker: Marker): MdNode {
    if (marker === 'new') return { type: 'changelogNew', data: { hName: 'span', hProperties: { dataTag: 'new' } }, children: [] }
    if (RARITIES.has(marker)) return { type: 'changelogRarity', data: { hName: 'span', hProperties: { dataRarity: marker } }, children: [] }
    return { type: 'changelogDelta', data: { hName: 'span', hProperties: { dataDelta: marker } }, children: [] }
}

function takeMarkers(text: string): { markers: MdNode[]; rest: string } {
    const markers: MdNode[] = []
    let rest = text
    let match = MARKER_PREFIX.exec(rest)
    while (match) {
        markers.push(markerNode(match[1].toLowerCase() as Marker))
        rest = rest.slice(match[0].length)
        match = MARKER_PREFIX.exec(rest)
    }
    return { markers, rest }
}

function markLineStarts(parent: MdNode) {
    const out: MdNode[] = []
    let atLineStart = true

    for (const child of parent.children ?? []) {
        if (child.type !== 'text' || typeof child.value !== 'string') {
            out.push(child)
            atLineStart = child.type === 'break'
            continue
        }

        const lines = child.value.split('\n')
        lines.forEach((line, idx) => {
            const text = line
            if (idx > 0 || atLineStart) {
                const { markers, rest } = takeMarkers(text)
                if (markers.length > 0) {
                    if (idx > 0) out.push({ type: 'text', value: '\n' })
                    out.push(...markers)
                    if (rest) out.push({ type: 'text', value: rest })
                    return
                }
            }
            const piece = (idx > 0 ? '\n' : '') + text
            if (piece) out.push({ type: 'text', value: piece })
        })
        atLineStart = lines.length > 1 && lines[lines.length - 1] === ''
    }

    parent.children = out
}

function lineRange(start: number | undefined, from: number, to: number): MdNode['position'] {
    return start === undefined ? undefined : { start: { line: start + from }, end: { line: start + to } }
}

function imageNode(token: ImageToken, position: MdNode['position']): MdNode {
    return {
        type: 'changelogImage',
        data: {
            hName: 'img',
            hProperties: {
                dataImage: token.name,
                dataPlacement: token.placement,
                ...(token.width ? { dataWidth: String(token.width) } : {}),
            },
        },
        position,
    }
}

function splitImageLines(paragraph: MdNode): MdNode[] | null {
    const lines: MdNode[][] = [[]]
    for (const child of paragraph.children ?? []) {
        if (child.type === 'break') lines.push([])
        else lines[lines.length - 1].push(child)
    }
    const tokens = lines.map(line => (line.length === 1 && line[0].type === 'text' ? parseImageToken(line[0].value ?? '') : null))
    if (!tokens.some(Boolean)) return null

    const start = paragraph.position?.start.line
    const out: MdNode[] = []
    let buffer: MdNode[] = []
    let bufferFrom = 0
    const flush = (to: number) => {
        if (buffer.length > 0) out.push({ type: 'paragraph', children: buffer, position: lineRange(start, bufferFrom, to) })
        buffer = []
    }

    lines.forEach((line, idx) => {
        const token = tokens[idx]
        if (token) {
            flush(idx - 1)
            out.push(imageNode(token, lineRange(start, idx, idx)))
            return
        }
        if (line.length === 0) return
        if (buffer.length === 0) bufferFrom = idx
        else buffer.push({ type: 'break' })
        buffer.push(...line)
    })
    flush(lines.length - 1)
    return out
}

function markImages(node: MdNode) {
    if (!node.children) return
    node.children = node.children.flatMap(child => {
        if (child.type === 'paragraph') return splitImageLines(child) ?? [child]
        markImages(child)
        return [child]
    })
}

function markDeltas(node: MdNode) {
    if (PHRASING_PARENTS.has(node.type)) markLineStarts(node)
    for (const child of node.children ?? []) markDeltas(child)
}

const MARKER_TYPES = new Set(['changelogDelta', 'changelogNew', 'changelogRarity'])

function hoistListMarker(item: MdNode) {
    const first = item.children?.[0]
    if (first?.type !== 'paragraph' || !first.children) return
    let lead = 0
    while (lead < first.children.length && MARKER_TYPES.has(first.children[lead].type)) lead++
    const at = first.children.slice(0, lead).findIndex(child => child.type === 'changelogDelta')
    if (at === -1) return
    const [delta] = first.children.splice(at, 1)
    setProperties(item, { dataMarker: delta.data?.hProperties?.dataDelta })
    item.children = [delta, ...(item.children ?? [])]
}

function hoistListMarkers(node: MdNode) {
    if (node.type === 'listItem') hoistListMarker(node)
    for (const child of node.children ?? []) hoistListMarkers(child)
}

function isTitleHeading(node: MdNode): boolean {
    return node.type === 'heading' && typeof node.depth === 'number' && node.depth <= 3
}

function startLine(node: MdNode): number | undefined {
    return node.position?.start.line
}

function hasGap(items: MdNode[]): boolean {
    return items.some((item, k) => {
        if (k === 0) return false
        const prevEnd = items[k - 1].position?.end.line
        const start = startLine(item)
        return prevEnd !== undefined && start !== undefined && start > prevEnd + 1
    })
}

function splitList(list: MdNode, end: number): { inside: MdNode; outside: MdNode | null } {
    const items = list.children ?? []
    const inside = items.filter(item => (startLine(item) ?? 0) <= end)
    const outside = items.slice(inside.length)
    if (outside.length === 0) return { inside: list, outside: null }
    return {
        inside: { ...list, children: inside, spread: hasGap(inside) },
        outside: {
            ...list,
            children: outside,
            spread: hasGap(outside),
            start: list.ordered ? (list.start ?? 1) + inside.length : list.start,
            position: outside[0].position && list.position
                ? { start: outside[0].position.start, end: list.position.end }
                : undefined,
        },
    }
}

function buildSections(root: MdNode, slug: (text: string) => string, toggleEnds: Map<number, number>) {
    const queue = [...(root.children ?? [])]
    const out: MdNode[] = []

    while (queue.length > 0) {
        const node = queue.shift()!
        const line = startLine(node)
        const end = node.type === 'heading' && line !== undefined ? toggleEnds.get(line) : undefined

        if (end === undefined) {
            if (isTitleHeading(node)) setProperties(node, { id: slug(textOf(node)) })
            out.push(node)
            continue
        }

        const id = slug(textOf(node))
        const body: MdNode[] = []
        while (queue.length > 0) {
            const next = queue[0]
            const nextLine = startLine(next)
            if (nextLine === undefined || nextLine > end || isTitleHeading(next) || toggleEnds.has(nextLine)) break
            if (next.type === 'list' && (next.position?.end.line ?? 0) > end) {
                const { inside, outside } = splitList(next, end)
                body.push(inside)
                if (outside) queue[0] = outside
                else queue.shift()
                break
            }
            body.push(queue.shift()!)
        }

        if (body.length === 0) {
            setProperties(node, { id })
            out.push(node)
            continue
        }

        out.push({
            type: 'changelogToggle',
            data: { hName: 'details', hProperties: { id } },
            children: [
                { type: 'changelogSummary', data: { hName: 'summary' }, children: [node] },
                ...body,
            ],
        })
    }

    root.children = out
}

export default function remarkChangelog(options: { toggles?: ToggleRange[] } = {}) {
    const toggleEnds = new Map((options.toggles ?? []).map(t => [t.start, t.end]))
    return (tree: MdNode) => {
        markImages(tree)
        markDeltas(tree)
        hoistListMarkers(tree)
        buildSections(tree, createSlugger(), toggleEnds)
    }
}
