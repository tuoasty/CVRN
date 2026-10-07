import { applyTextareaEdit, type TextEdit } from './textareaEdit'

export type EmphasisKind = 'bold' | 'italic'

export type EmphasisEdit = TextEdit

const MARKERS: Record<EmphasisKind, string> = { bold: '**', italic: '*' }

function isApplied(kind: EmphasisKind, stars: number): boolean {
    return kind === 'bold' ? stars >= 2 : stars % 2 === 1
}

function starsBefore(value: string, pos: number, limit = 0): number {
    let n = 0
    while (pos - n - 1 >= limit && value[pos - n - 1] === '*') n++
    return n
}

function starsAfter(value: string, pos: number, limit = value.length): number {
    let n = 0
    while (pos + n < limit && value[pos + n] === '*') n++
    return n
}

export function toggleEmphasis(value: string, selectionStart: number, selectionEnd: number, kind: EmphasisKind): EmphasisEdit {
    let start = Math.min(selectionStart, selectionEnd)
    let end = Math.max(selectionStart, selectionEnd)
    while (start < end && /\s/.test(value[start])) start++
    while (end > start && /\s/.test(value[end - 1])) end--

    const marker = MARKERS[kind]
    const m = marker.length

    const lead = starsAfter(value, start, end)
    const trail = starsBefore(value, end, start + lead)
    const inner = Math.min(lead, trail)
    if (inner > 0 && isApplied(kind, inner)) {
        const text = value.slice(start + m, end - m)
        return { from: start, to: end, insert: text, selStart: start, selEnd: start + text.length }
    }

    const outer = Math.min(starsBefore(value, start), starsAfter(value, end))
    if (outer > 0 && isApplied(kind, outer)) {
        const text = value.slice(start, end)
        return { from: start - m, to: end + m, insert: text, selStart: start - m, selEnd: start - m + text.length }
    }

    const text = value.slice(start, end)
    return { from: start, to: end, insert: marker + text + marker, selStart: start + m, selEnd: start + m + text.length }
}

export function applyEmphasisShortcut(el: HTMLTextAreaElement, kind: EmphasisKind, onFallback: (value: string) => void): void {
    applyTextareaEdit(el, toggleEmphasis(el.value, el.selectionStart, el.selectionEnd, kind), onFallback)
}

export function emphasisKindForKey(e: { key: string; ctrlKey: boolean; metaKey: boolean; shiftKey: boolean; altKey: boolean }): EmphasisKind | null {
    if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey) return null
    const key = e.key.toLowerCase()
    if (key === 'b') return 'bold'
    if (key === 'i') return 'italic'
    return null
}
