import type { TextEdit } from './textareaEdit'
import { lineIndexAt, splitLines, touchedLineRange } from './textLines'

export type HeadingLevel = 1 | 2 | 3

const LINE = /^( {0,3}(?:> ?)?)(#{1,6} +)?/

interface ParsedLine {
    prefixLen: number
    markLen: number
    level: number
    isTarget: boolean
}

function parseLine(text: string): Omit<ParsedLine, 'isTarget'> {
    const m = LINE.exec(text)!
    const mark = m[2] ?? ''
    return { prefixLen: m[1].length, markLen: mark.length, level: mark.replace(/ +$/, '').length }
}

export function setHeading(value: string, selectionStart: number, selectionEnd: number, level: HeadingLevel): TextEdit {
    const selStart = Math.min(selectionStart, selectionEnd)
    const selEnd = Math.max(selectionStart, selectionEnd)
    const lines = splitLines(value)
    const { first, last } = touchedLineRange(lines, selStart, selEnd)

    const range = lines.slice(first, last + 1)
    const anyText = range.some(l => l.text.trim() !== '')
    const parsed: ParsedLine[] = range.map(l => ({
        ...parseLine(l.text),
        isTarget: !anyText || l.text.trim() !== '',
    }))

    const targets = parsed.filter(p => p.isTarget)
    const newMark = targets.every(p => p.level === level) ? '' : `${'#'.repeat(level)} `

    const newTexts = range.map((l, k) => {
        const p = parsed[k]
        if (!p.isTarget) return l.text
        return l.text.slice(0, p.prefixLen) + newMark + l.text.slice(p.prefixLen + p.markLen)
    })
    const deltas = range.map((l, k) => newTexts[k].length - l.text.length)

    function mapPos(pos: number): number {
        const k = lineIndexAt(lines, pos) - first
        if (k >= range.length) return pos + deltas.reduce((sum, d) => sum + d, 0)
        const before = deltas.slice(0, k).reduce((sum, d) => sum + d, 0)
        const newLineStart = range[k].start + before
        const offset = pos - range[k].start
        const p = parsed[k]
        if (!p.isTarget || offset < p.prefixLen) return newLineStart + offset
        if (offset < p.prefixLen + p.markLen) return newLineStart + p.prefixLen + newMark.length
        return newLineStart + offset + deltas[k]
    }

    return {
        from: range[0].start,
        to: range[range.length - 1].start + range[range.length - 1].text.length,
        insert: newTexts.join('\n'),
        selStart: mapPos(selStart),
        selEnd: mapPos(selEnd),
    }
}

export function headingLevelForKey(e: { code: string; ctrlKey: boolean; metaKey: boolean; altKey: boolean; shiftKey: boolean }): HeadingLevel | null {
    if (!(e.ctrlKey || e.metaKey) || !e.altKey || e.shiftKey) return null
    if (e.code === 'Digit1') return 1
    if (e.code === 'Digit2') return 2
    if (e.code === 'Digit3') return 3
    return null
}
