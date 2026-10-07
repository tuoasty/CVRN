import { describe, expect, it } from 'vitest'
import { toggleEmphasis, type EmphasisEdit } from '../markdownEmphasis'

function apply(value: string, edit: EmphasisEdit) {
    const text = value.slice(0, edit.from) + edit.insert + value.slice(edit.to)
    return { text, selected: text.slice(edit.selStart, edit.selEnd), selStart: edit.selStart, selEnd: edit.selEnd }
}

function run(value: string, start: number, end: number, kind: 'bold' | 'italic') {
    return apply(value, toggleEmphasis(value, start, end, kind))
}

describe('toggleEmphasis', () => {
    it('wraps a selection in bold and keeps the word selected', () => {
        const r = run('a word here', 2, 6, 'bold')
        expect(r.text).toBe('a **word** here')
        expect(r.selected).toBe('word')
    })

    it('wraps a selection in italic', () => {
        const r = run('a word here', 2, 6, 'italic')
        expect(r.text).toBe('a *word* here')
        expect(r.selected).toBe('word')
    })

    it('inserts empty markers with the caret between them when nothing is selected', () => {
        const r = run('ab', 1, 1, 'bold')
        expect(r.text).toBe('a****b')
        expect(r.selStart).toBe(3)
        expect(r.selEnd).toBe(3)
    })

    it('removes empty markers when the caret sits between them', () => {
        const r = run('a****b', 3, 3, 'bold')
        expect(r.text).toBe('ab')
        expect(r.selStart).toBe(1)
    })

    it('trims whitespace from the selection before wrapping', () => {
        const r = run('a word here', 2, 7, 'bold')
        expect(r.text).toBe('a **word** here')
        expect(r.selected).toBe('word')
    })

    it('unwraps bold when the markers surround the selection', () => {
        const r = run('a **word** here', 4, 8, 'bold')
        expect(r.text).toBe('a word here')
        expect(r.selected).toBe('word')
    })

    it('unwraps bold when the markers are inside the selection', () => {
        const r = run('a **word** here', 2, 10, 'bold')
        expect(r.text).toBe('a word here')
        expect(r.selected).toBe('word')
    })

    it('unwraps italic when the markers surround the selection', () => {
        const r = run('a *word* here', 3, 7, 'italic')
        expect(r.text).toBe('a word here')
        expect(r.selected).toBe('word')
    })

    it('adds italic on top of bold instead of stripping a bold star', () => {
        const r = run('a **word** here', 4, 8, 'italic')
        expect(r.text).toBe('a ***word*** here')
        expect(r.selected).toBe('word')
    })

    it('adds bold on top of italic', () => {
        const r = run('a *word* here', 3, 7, 'bold')
        expect(r.text).toBe('a ***word*** here')
        expect(r.selected).toBe('word')
    })

    it('removes only bold from bold italic', () => {
        const r = run('a ***word*** here', 5, 9, 'bold')
        expect(r.text).toBe('a *word* here')
        expect(r.selected).toBe('word')
    })

    it('removes only italic from bold italic', () => {
        const r = run('a ***word*** here', 5, 9, 'italic')
        expect(r.text).toBe('a **word** here')
        expect(r.selected).toBe('word')
    })

    it('does not treat a list bullet as an italic marker', () => {
        const r = run('* item', 2, 6, 'italic')
        expect(r.text).toBe('* *item*')
    })

    it('wraps a selection that spans lines as one block', () => {
        const r = run('one\ntwo', 0, 7, 'bold')
        expect(r.text).toBe('**one\ntwo**')
    })
})
