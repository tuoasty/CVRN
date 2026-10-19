import { describe, expect, it } from 'vitest'
import { INFORMATION_SEGMENTS, activeSegment } from '../segments'

describe('INFORMATION_SEGMENTS', () => {
    it('orders abilities, builds, updates, specs', () => {
        expect(INFORMATION_SEGMENTS.map(s => s.key)).toEqual(['abilities', 'builds', 'updates', 'specs'])
        expect(INFORMATION_SEGMENTS.map(s => s.href)).toEqual([
            '/information/abilities',
            '/information/builds',
            '/information/updates',
            '/information/specs',
        ])
    })
})

describe('activeSegment', () => {
    it.each([
        ['/information', 'abilities'],
        ['/information/abilities', 'abilities'],
        ['/information/specs/leon', 'specs'],
        ['/information/updates/1.5', 'updates'],
        ['/information/builds', 'builds'],
    ])('%s -> %s', (pathname, expected) => {
        expect(activeSegment(pathname)).toBe(expected)
    })
})
