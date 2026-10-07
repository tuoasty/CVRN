import { describe, expect, it } from 'vitest'
import { indentLines } from '../markdownIndent'
import type { TextEdit } from '../textareaEdit'

function apply(value: string, edit: TextEdit | null) {
    if (!edit) return { text: value, selStart: -1, selEnd: -1, selected: '' }
    const text = value.slice(0, edit.from) + edit.insert + value.slice(edit.to)
    return { text, selStart: edit.selStart, selEnd: edit.selEnd, selected: text.slice(edit.selStart, edit.selEnd) }
}

function run(value: string, start: number, end: number, direction: 'in' | 'out') {
    return apply(value, indentLines(value, start, end, direction))
}

describe('indentLines', () => {
    it('inserts two spaces at the caret on a plain text line', () => {
        const r = run('abc', 1, 1, 'in')
        expect(r.text).toBe('a  bc')
        expect(r.selStart).toBe(3)
    })

    it('nests a bullet under the bullet above it', () => {
        const r = run('- a\n- b', 7, 7, 'in')
        expect(r.text).toBe('- a\n  - b')
        expect(r.selStart).toBe(9)
    })

    it('nests a bullet under a numbered item using the wider content column', () => {
        const r = run('1. a\n- b', 8, 8, 'in')
        expect(r.text).toBe('1. a\n   - b')
    })

    it('indents a list line by two spaces when there is no sibling above', () => {
        const r = run('- a', 3, 3, 'in')
        expect(r.text).toBe('  - a')
    })

    it('indents a nested bullet one level deeper', () => {
        const r = run('- a\n  - b\n  - c', 15, 15, 'in')
        expect(r.text).toBe('- a\n  - b\n    - c')
    })

    it('outdents a nested bullet back to its parent level', () => {
        const r = run('- a\n  - b', 9, 9, 'out')
        expect(r.text).toBe('- a\n- b')
        expect(r.selStart).toBe(7)
    })

    it('outdents a bullet nested under a numbered item', () => {
        const r = run('1. a\n   - b', 11, 11, 'out')
        expect(r.text).toBe('1. a\n- b')
    })

    it('returns null when outdenting a line with no indentation', () => {
        expect(indentLines('- a', 3, 3, 'out')).toBeNull()
    })

    it('outdents plain text by up to two spaces', () => {
        expect(run(' abc', 2, 2, 'out').text).toBe('abc')
        expect(run('    abc', 5, 5, 'out').text).toBe('  abc')
    })

    it('indents a single-line selection on a plain line instead of replacing it', () => {
        const r = run('hello', 1, 4, 'in')
        expect(r.text).toBe('  hello')
        expect(r.selected).toBe('ell')
    })

    it('indents every selected line by the same amount', () => {
        const r = run('- a\n- b\n- c', 4, 11, 'in')
        expect(r.text).toBe('- a\n  - b\n  - c')
        expect(r.selected).toBe('- b\n  - c')
    })

    it('outdents every selected line', () => {
        const r = run('- a\n  - b\n  - c', 4, 15, 'out')
        expect(r.text).toBe('- a\n- b\n- c')
    })

    it('ignores a line that the selection only touches at its start', () => {
        const r = run('- a\n- b\n- c', 4, 8, 'in')
        expect(r.text).toBe('- a\n  - b\n- c')
    })

    it('keeps the caret at the line start when outdenting past it', () => {
        const r = run('- a\n  - b', 5, 5, 'out')
        expect(r.text).toBe('- a\n- b')
        expect(r.selStart).toBe(4)
    })
})
