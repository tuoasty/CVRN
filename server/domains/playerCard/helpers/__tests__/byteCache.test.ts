import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createByteCache } from '../byteCache'

describe('createByteCache', () => {
    beforeEach(() => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date('2026-11-02T00:00:00.000Z'))
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('returns stored values and misses unknown keys', () => {
        const cache = createByteCache({ maxBytes: 100, ttlMs: 1000 })
        cache.set('a', 'xxxx')
        expect(cache.get('a')).toBe('xxxx')
        expect(cache.get('b')).toBeUndefined()
    })

    it('expires entries after the ttl and frees their bytes', () => {
        const cache = createByteCache({ maxBytes: 100, ttlMs: 1000 })
        cache.set('a', 'xxxx')
        vi.advanceTimersByTime(1000)
        expect(cache.get('a')).toBeUndefined()
        expect(cache.size()).toBe(0)
    })

    it('evicts the least recently used entry when over the byte cap', () => {
        const cache = createByteCache({ maxBytes: 10, ttlMs: 1000 })
        cache.set('art', 'xxxx')
        cache.set('avatar', 'xxxx')
        cache.get('art')
        cache.set('logo', 'xxxx')
        expect(cache.get('art')).toBe('xxxx')
        expect(cache.get('avatar')).toBeUndefined()
        expect(cache.get('logo')).toBe('xxxx')
        expect(cache.size()).toBe(8)
    })

    it('counts a replaced value once', () => {
        const cache = createByteCache({ maxBytes: 10, ttlMs: 1000 })
        cache.set('a', 'xxxxxx')
        cache.set('a', 'xx')
        expect(cache.size()).toBe(2)
    })

    it('never stores a value larger than the cap', () => {
        const cache = createByteCache({ maxBytes: 3, ttlMs: 1000 })
        cache.set('a', 'xxx')
        cache.set('b', 'xxxx')
        expect(cache.get('b')).toBeUndefined()
        expect(cache.get('a')).toBe('xxx')
    })
})
