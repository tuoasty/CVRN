import { describe, expect, it } from 'vitest'
import { rarityTextClass } from '../rarity'

describe('rarityTextClass', () => {
    it.each([
        ['Common', 'text-foreground'],
        ['Rare', 'text-rarity-rare'],
        ['Epic', 'text-rarity-epic'],
        ['Mythical', 'text-rarity-mythic'],
        ['mythic', 'text-rarity-mythic'],
        ['RARE', 'text-rarity-rare'],
        ['Legendary', 'text-foreground'],
    ])('%s -> %s', (rarity, cls) => {
        expect(rarityTextClass(rarity)).toBe(cls)
    })
})
