export type Delta = 'buff' | 'nerf'

interface MdData {
    hName?: string
    hProperties?: Record<string, unknown>
}

interface MdNode {
    type: string
    depth?: number
    value?: string
    children?: MdNode[]
    data?: MdData
    position?: { start: { line: number }; end: { line: number } }
}

const DELTA_PREFIX = /^\s*\[(buff|nerf)\]\s*/i

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
    const seen = new Map<string, number>()
    return (text: string) => {
        const base = slugBase(text)
        const count = (seen.get(base) ?? 0) + 1
        seen.set(base, count)
        return count === 1 ? base : `${base}-${count}`
    }
}

function textOf(node: MdNode): string {
    if (typeof node.value === 'string') return node.value
    return (node.children ?? []).map(textOf).join('')
}

function setProperties(node: MdNode, props: Record<string, unknown>) {
    node.data = { ...node.data, hProperties: { ...node.data?.hProperties, ...props } }
}

function markDeltas(node: MdNode) {
    if (node.type === 'listItem') {
        const first = node.children?.[0]
        const lead = first?.type === 'paragraph' ? first.children?.[0] : undefined
        const match = lead?.type === 'text' && typeof lead.value === 'string' ? DELTA_PREFIX.exec(lead.value) : null
        if (lead && match) {
            lead.value = lead.value!.slice(match[0].length)
            setProperties(node, { dataDelta: match[1].toLowerCase() })
        }
    }
    for (const child of node.children ?? []) markDeltas(child)
}

function isTitleHeading(node: MdNode): boolean {
    return node.type === 'heading' && typeof node.depth === 'number' && node.depth <= 3
}

function splitParagraphTitle(paragraph: MdNode): { title: MdNode[]; rest: MdNode[] } {
    const title: MdNode[] = []
    const rest: MdNode[] = []
    let inTitle = true
    for (const child of paragraph.children ?? []) {
        if (!inTitle) {
            rest.push(child)
            continue
        }
        if (child.type === 'break') {
            inTitle = false
            continue
        }
        const newline = child.type === 'text' ? (child.value ?? '').indexOf('\n') : -1
        if (newline !== -1) {
            const head = child.value!.slice(0, newline)
            const tail = child.value!.slice(newline + 1)
            if (head) title.push({ type: 'text', value: head })
            if (tail) rest.push({ type: 'text', value: tail })
            inTitle = false
            continue
        }
        title.push(child)
    }
    return { title, rest }
}

function splitQuote(quote: MdNode): { heading: MdNode | null; title: MdNode[]; rest: MdNode[] } | null {
    const [first, ...others] = quote.children ?? []
    if (!first) return null
    if (isTitleHeading(first)) return { heading: first, title: first.children ?? [], rest: others }
    if (first.type !== 'paragraph') return null
    const { title, rest } = splitParagraphTitle(first)
    const restNodes = rest.length > 0 ? [{ type: 'paragraph', children: rest }, ...others] : others
    return { heading: null, title, rest: restNodes }
}

function buildSections(root: MdNode, slug: (text: string) => string) {
    const source = root.children ?? []
    const out: MdNode[] = []

    for (let i = 0; i < source.length; i++) {
        const node = source[i]

        if (isTitleHeading(node)) {
            setProperties(node, { id: slug(textOf(node)) })
            out.push(node)
            continue
        }

        const split = node.type === 'blockquote' ? splitQuote(node) : null
        if (!split) {
            out.push(node)
            continue
        }

        const body = [...split.rest]
        let endLine = node.position?.end.line
        while (i + 1 < source.length && endLine !== undefined) {
            const next = source[i + 1]
            if (next.position?.start.line !== endLine + 1) break
            if (isTitleHeading(next) || next.type === 'blockquote') break
            body.push(next)
            endLine = next.position?.end.line
            i++
        }

        const id = slug(split.title.map(textOf).join(''))

        if (body.length === 0) {
            if (split.heading) {
                setProperties(split.heading, { id })
                out.push(split.heading)
            } else {
                out.push({ type: 'paragraph', children: split.title })
            }
            continue
        }

        const summaryContent = split.heading ?? { type: 'changelogTitle', data: { hName: 'span' }, children: split.title }
        out.push({
            type: 'changelogToggle',
            data: { hName: 'details', hProperties: { id } },
            children: [
                { type: 'changelogSummary', data: { hName: 'summary' }, children: [summaryContent] },
                ...body,
            ],
        })
    }

    root.children = out
}

export default function remarkChangelog() {
    return (tree: MdNode) => {
        markDeltas(tree)
        buildSections(tree, createSlugger())
    }
}
