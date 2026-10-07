import { describe, expect, it } from 'vitest'
import { neighborsOf } from '../neighborsOf'

const entry = (version: string) => ({ version, title: null, released_at: '2026-10-01' })
const index = [entry('1.3'), entry('1.2'), entry('1.1')]

describe('neighborsOf', () => {
    it('returns the newer and older entries around a middle version', () => {
        const n = neighborsOf(index, '1.2')
        expect(n.newer?.version).toBe('1.3')
        expect(n.older?.version).toBe('1.1')
    })

    it('has no newer entry for the latest version', () => {
        const n = neighborsOf(index, '1.3')
        expect(n.newer).toBeNull()
        expect(n.older?.version).toBe('1.2')
    })

    it('has no older entry for the first version', () => {
        const n = neighborsOf(index, '1.1')
        expect(n.newer?.version).toBe('1.2')
        expect(n.older).toBeNull()
    })

    it('returns no neighbors for a version missing from the index', () => {
        expect(neighborsOf(index, '9.9')).toEqual({ newer: null, older: null })
    })
})
