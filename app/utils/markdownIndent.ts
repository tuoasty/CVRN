import type { TextEdit } from './textareaEdit'

export type IndentDirection = 'in' | 'out'

const INDENT = 2
const LIST_ITEM = /^( *)([-*+]|\d{1,9}[.)])( {1,4}|$)/
const HEADING = /^ {0,3}#{1,6}(\s|$)/

interface Line {
    start: number
    text: string
}

function splitLines(value: string): Line[] {
    const lines: Line[] = []
    let start = 0
    for (const text of value.split('\n')) {
        lines.push({ start, text })
        start += text.length + 1
    }
    return lines
}

function leadingSpaces(text: string): number {
    return text.length - text.replace(/^ +/, '').length
}

function listItem(text: string): { indent: number; contentOffset: number } | null {
    const m = LIST_ITEM.exec(text)
    if (!m) return null
    return { indent: m[1].length, contentOffset: m[2].length + Math.max(1, m[3].length) }
}

function lineIndexAt(lines: Line[], pos: number): number {
    for (let i = lines.length - 1; i >= 0; i--) {
        if (lines[i].start <= pos) return i
    }
    return 0
}

function nestDelta(lines: Line[], index: number, indent: number): number {
    for (let i = index - 1; i >= 0; i--) {
        if (HEADING.test(lines[i].text)) break
        const item = listItem(lines[i].text)
        if (!item) continue
        if (item.indent === indent) return item.contentOffset
        if (item.indent < indent) break
    }
    return INDENT
}

function unnestDelta(lines: Line[], index: number, indent: number): number {
    for (let i = index - 1; i >= 0; i--) {
        if (HEADING.test(lines[i].text)) break
        const item = listItem(lines[i].text)
        if (item && item.indent < indent) return indent - item.indent
    }
    return indent
}

export function indentLines(value: string, selectionStart: number, selectionEnd: number, direction: IndentDirection): TextEdit | null {
    const selStart = Math.min(selectionStart, selectionEnd)
    const selEnd = Math.max(selectionStart, selectionEnd)
    const lines = splitLines(value)

    const first = lineIndexAt(lines, selStart)
    let last = lineIndexAt(lines, selEnd)
    if (last > first && selEnd === lines[last].start) last--

    const firstItemIndex = lines.slice(first, last + 1).findIndex(l => listItem(l.text))
    const isCaret = selStart === selEnd

    if (direction === 'in' && isCaret && firstItemIndex === -1) {
        return { from: selStart, to: selStart, insert: ' '.repeat(INDENT), selStart: selStart + INDENT, selEnd: selStart + INDENT }
    }

    let delta = INDENT
    if (firstItemIndex !== -1) {
        const index = first + firstItemIndex
        const item = listItem(lines[index].text)!
        delta = direction === 'in' ? nestDelta(lines, index, item.indent) : unnestDelta(lines, index, item.indent)
    }

    const deltas: number[] = []
    for (let i = first; i <= last; i++) {
        deltas.push(direction === 'in' ? delta : -Math.min(delta, leadingSpaces(lines[i].text)))
    }
    if (deltas.every(d => d === 0)) return null

    const newTexts = deltas.map((d, k) => {
        const text = lines[first + k].text
        return d >= 0 ? ' '.repeat(d) + text : text.slice(-d)
    })

    function mapPos(pos: number): number {
        const k = lineIndexAt(lines, pos) - first
        if (k >= deltas.length) return pos + deltas.reduce((sum, d) => sum + d, 0)
        const before = deltas.slice(0, k).reduce((sum, d) => sum + d, 0)
        const lineStart = lines[first + k].start + before
        const offset = pos - lines[first + k].start
        return lineStart + Math.max(0, offset + deltas[k])
    }

    const from = lines[first].start
    const to = lines[last].start + lines[last].text.length
    return {
        from,
        to,
        insert: newTexts.join('\n'),
        selStart: mapPos(selStart),
        selEnd: mapPos(selEnd),
    }
}
