import { describe, expect, it } from 'vitest'
import { activeTocId } from '../tocNavigation'

const positions = [
    { id: 'overview', top: 100 },
    { id: 'features', top: 400 },
    { id: 'bug-fixes', top: 900 },
]

describe('activeTocId', () => {
    it('returns null with no entries', () => {
        expect(activeTocId([], 80, false)).toBeNull()
    })

    it('falls back to the first entry before anything reaches the offset', () => {
        expect(activeTocId(positions, 80, false)).toBe('overview')
    })

    it('picks the last entry whose top has passed the offset', () => {
        const scrolled = positions.map(p => ({ ...p, top: p.top - 350 }))
        expect(activeTocId(scrolled, 80, false)).toBe('features')
    })

    it('counts an entry sitting exactly at the offset as active', () => {
        const atOffset = positions.map(p => ({ ...p, top: p.top - 320 }))
        expect(activeTocId(atOffset, 80, false)).toBe('features')
    })

    it('picks the last entry once the page is scrolled to the bottom', () => {
        expect(activeTocId(positions, 80, true)).toBe('bug-fixes')
    })

    it('ignores entries that are missing from the page', () => {
        const missing = [{ id: 'a', top: -50 }, { id: 'b', top: Number.POSITIVE_INFINITY }]
        expect(activeTocId(missing, 80, false)).toBe('a')
    })
})
