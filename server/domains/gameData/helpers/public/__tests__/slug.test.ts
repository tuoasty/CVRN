import { describe, expect, it } from 'vitest'
import { toSlug } from '../slug'

describe('toSlug', () => {
    it.each([
        ["Captain's Call", 'captains-call'],
        ["Captain's Jump", 'captains-jump'],
        ['Captain’s Rec', 'captains-rec'],
        ['Captains Call', 'captains-call'],
        ['Wilfredo León', 'wilfredo-leon'],
        ['  A + B ', 'a-b'],
        ['All-Rounder', 'all-rounder'],
        ['Reaper', 'reaper'],
    ])('%s -> %s', (name, slug) => {
        expect(toSlug(name)).toBe(slug)
    })
})
