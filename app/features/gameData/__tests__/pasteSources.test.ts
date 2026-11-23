import { describe, expect, it } from 'vitest'
import { canChoose, joinFiles, sourceForLine } from '../pasteSources'
import { parseLuaData } from '@/server/domains/gameData/helpers/lua/parseLuaData'

describe('joinFiles', () => {
    it('records the line each file starts on in the joined paste', () => {
        const joined = joinFiles([
            { name: 'a.txt', text: 'A = {\n  1,\n}' },
            { name: 'b.txt', text: 'return {\n  2,\n}\n' },
            { name: 'c.txt', text: 'return { 3 }' },
        ])
        expect(joined.sources).toEqual([
            { name: 'a.txt', startLine: 1 },
            { name: 'b.txt', startLine: 5 },
            { name: 'c.txt', startLine: 10 },
        ])
        const parsed = parseLuaData(joined.text)
        expect(parsed.ok && parsed.value.map(s => s.line)).toEqual([1, 5, 10])
    })
})

describe('sourceForLine', () => {
    const sources = [{ name: 'a.txt', startLine: 1 }, { name: 'b.txt', startLine: 5 }]

    it('names the file a line belongs to', () => {
        expect(sourceForLine(sources, 1)).toBe('a.txt')
        expect(sourceForLine(sources, 4)).toBe('a.txt')
        expect(sourceForLine(sources, 5)).toBe('b.txt')
    })

    it('has no name for a hand-pasted text', () => {
        expect(sourceForLine([], 3)).toBeNull()
    })
})

describe('canChoose', () => {
    it('allows a choice only on a fresh preview that is not loading', () => {
        expect(canChoose({ previewedText: 'x', text: 'x', busy: false })).toBe(true)
        expect(canChoose({ previewedText: 'x', text: 'y', busy: false })).toBe(false)
        expect(canChoose({ previewedText: 'x', text: 'x', busy: true })).toBe(false)
        expect(canChoose({ previewedText: null, text: 'x', busy: false })).toBe(false)
    })
})
