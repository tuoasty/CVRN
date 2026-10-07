import { describe, expect, it } from 'vitest'
import { setHeading, headingLevelForKey } from '../markdownHeading'
import type { TextEdit } from '../textareaEdit'

function apply(value: string, edit: TextEdit) {
    const text = value.slice(0, edit.from) + edit.insert + value.slice(edit.to)
    return { text, selStart: edit.selStart, selEnd: edit.selEnd, selected: text.slice(edit.selStart, edit.selEnd) }
}

function run(value: string, start: number, end: number, level: 1 | 2 | 3) {
    return apply(value, setHeading(value, start, end, level))
}

describe('setHeading', () => {
    it('turns a plain line into a heading and keeps the caret on the same text', () => {
        const r = run('Title', 3, 3, 1)
        expect(r.text).toBe('# Title')
        expect(r.selStart).toBe(5)
    })

    it('removes the heading when the line already has that level', () => {
        const r = run('## Title', 8, 8, 2)
        expect(r.text).toBe('Title')
        expect(r.selStart).toBe(5)
    })

    it('switches between heading levels', () => {
        expect(run('# Title', 7, 7, 3).text).toBe('### Title')
        expect(run('### Title', 9, 9, 1).text).toBe('# Title')
    })

    it('keeps the > prefix of a collapsible', () => {
        expect(run('> ### Relentless', 16, 16, 2).text).toBe('> ## Relentless')
        expect(run('> Nation VFX', 12, 12, 3).text).toBe('> ### Nation VFX')
    })

    it('removes the heading but keeps the > prefix when toggled off', () => {
        expect(run('> ### Relentless', 16, 16, 3).text).toBe('> Relentless')
    })

    it('inserts heading marks on an empty line with the caret after them', () => {
        const r = run('', 0, 0, 2)
        expect(r.text).toBe('## ')
        expect(r.selStart).toBe(3)
    })

    it('moves a caret sitting inside the old marks to the start of the text', () => {
        const r = run('## Title', 1, 1, 3)
        expect(r.text).toBe('### Title')
        expect(r.selStart).toBe(4)
    })

    it('keeps a selection covering the same text', () => {
        const r = run('Title', 1, 4, 1)
        expect(r.selected).toBe('itl')
    })

    it('applies to every selected non-empty line', () => {
        const r = run('a\n\nb', 0, 4, 1)
        expect(r.text).toBe('# a\n\n# b')
    })

    it('removes the heading from every selected line when all already have that level', () => {
        expect(run('## a\n## b', 0, 9, 2).text).toBe('a\nb')
    })

    it('sets every selected line to the level when only some have it', () => {
        expect(run('## a\nb', 0, 6, 2).text).toBe('## a\n## b')
    })

    it('treats #hashtag without a space as text, not a heading', () => {
        expect(run('#hashtag', 0, 0, 1).text).toBe('# #hashtag')
    })

    it('only touches the line the caret is on', () => {
        expect(run('one\ntwo\nthree', 5, 5, 2).text).toBe('one\n## two\nthree')
    })
})

describe('headingLevelForKey', () => {
    const key = (code: string, mods: Partial<{ ctrlKey: boolean; metaKey: boolean; altKey: boolean; shiftKey: boolean }>) =>
        ({ code, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, ...mods })

    it('maps Ctrl+Alt+1/2/3 to heading levels', () => {
        expect(headingLevelForKey(key('Digit1', { ctrlKey: true, altKey: true }))).toBe(1)
        expect(headingLevelForKey(key('Digit2', { ctrlKey: true, altKey: true }))).toBe(2)
        expect(headingLevelForKey(key('Digit3', { ctrlKey: true, altKey: true }))).toBe(3)
    })

    it('maps Cmd+Option+1 on Mac', () => {
        expect(headingLevelForKey(key('Digit1', { metaKey: true, altKey: true }))).toBe(1)
    })

    it('ignores other combinations', () => {
        expect(headingLevelForKey(key('Digit1', { ctrlKey: true }))).toBeNull()
        expect(headingLevelForKey(key('Digit4', { ctrlKey: true, altKey: true }))).toBeNull()
        expect(headingLevelForKey(key('Digit1', { ctrlKey: true, altKey: true, shiftKey: true }))).toBeNull()
    })
})
