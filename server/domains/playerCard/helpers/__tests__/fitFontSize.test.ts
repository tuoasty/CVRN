import { beforeAll, describe, expect, it } from 'vitest'
import type opentype from 'opentype.js'
import { loadTestFonts } from './testFonts'
import { fitFontSize, fitRunsFontSize, measureTextWidth } from '../fitFontSize'

let font: opentype.Font

beforeAll(async () => {
    font = (await loadTestFonts()).norms.font
})

const box = { width: 500, height: 60, maxSize: 48, minSize: 20, letterSpacing: 0 }

describe('fitFontSize', () => {
    it('keeps max size when the text already fits', () => {
        expect(fitFontSize({ ...box, text: 'ACE', font })).toBe(48)
    })

    it('shrinks long names until they fit the box width', () => {
        const text = 'AVERYVERYVERYLONGNAME'
        const size = fitFontSize({ ...box, text, font })
        expect(size).toBeLessThan(48)
        expect(size).toBeGreaterThanOrEqual(20)
        expect(measureTextWidth(text, font, size, 0)).toBeLessThanOrEqual(box.width)
        expect(measureTextWidth(text, font, size + 0.5, 0)).toBeGreaterThan(box.width)
    })

    it('never goes below min size, even if the text still overflows', () => {
        expect(fitFontSize({ ...box, width: 40, text: 'AVERYVERYVERYLONGNAME', font })).toBe(20)
    })

    it('caps size at the box height', () => {
        expect(fitFontSize({ ...box, height: 30, text: 'A', font })).toBe(30)
    })

    it('accounts for letter spacing', () => {
        const text = 'SPIKERMAN_2026'
        const plain = fitFontSize({ ...box, width: 300, text, font })
        const spaced = fitFontSize({ ...box, width: 300, letterSpacing: 4, text, font })
        expect(spaced).toBeLessThan(plain)
        expect(measureTextWidth(text, font, spaced, 4)).toBeLessThanOrEqual(300)
    })

    it('returns the ceiling for empty text and the floor when spacing alone overflows', () => {
        expect(fitFontSize({ ...box, text: '', font })).toBe(48)
        expect(fitFontSize({ ...box, width: 10, letterSpacing: 5, text: 'ABCDE', font })).toBe(20)
    })

    it('fits several runs as if they were one string in one font', () => {
        const joined = fitFontSize({ ...box, width: 120, text: '88 SRV', font })
        const runs = fitRunsFontSize([{ text: '88', font }, { text: ' ', font }, { text: 'SRV', font }], { ...box, width: 120 })
        expect(runs).toBe(joined)
    })
})
