import { describe, expect, it } from 'vitest'
import type { PublicAbility } from '@/server/domains/gameData'
import { hasMoreContent } from '../hasMoreContent'

function ability(patch: Partial<PublicAbility>): PublicAbility {
    return { key: 'A', slug: 'a', kind: 'physical', rarity: 'Common', marker: null, summary: 'Line one', source: 'derived', lines: [{ text: 'Line one' }], ...patch }
}

describe('hasMoreContent', () => {
    it('is false for ORIGINAL, whose open text equals the summary', () => {
        expect(hasMoreContent(ability({ source: 'original', text: 'Line one', lines: [] }))).toBe(false)
    })

    it('is false for DERIVED with only the summary line', () => {
        expect(hasMoreContent(ability({}))).toBe(false)
    })

    it('is true for DERIVED with more than one line', () => {
        expect(hasMoreContent(ability({ lines: [{ text: 'Active ability, 150s cooldown' }, { text: 'Line one' }] }))).toBe(true)
    })

    it('is true when the only line grants an ability', () => {
        expect(hasMoreContent(ability({ lines: [{ text: 'Line one', grants: 'Stance' }] }))).toBe(true)
    })

    it('is false with no lines at all', () => {
        expect(hasMoreContent(ability({ summary: '', lines: [] }))).toBe(false)
    })
})
