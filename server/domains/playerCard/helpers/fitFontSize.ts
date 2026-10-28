import type opentype from 'opentype.js'

export interface FitFontSizeInput {
    text: string
    font: opentype.Font
    width: number
    height: number
    maxSize: number
    minSize: number
    letterSpacing: number
}

export function measureTextWidth(text: string, font: opentype.Font, size: number, letterSpacing: number): number {
    return font.getAdvanceWidth(text, size, { kerning: false }) + letterSpacing * [...text].length
}

export function fitFontSize({ text, font, width, height, maxSize, minSize, letterSpacing }: FitFontSizeInput): number {
    const ceiling = Math.min(maxSize, height)
    const floor = Math.min(minSize, ceiling)
    if (!text) return ceiling

    const advanceAtOne = font.getAdvanceWidth(text, 1, { kerning: false })
    if (advanceAtOne <= 0) return ceiling

    const room = width - letterSpacing * [...text].length
    if (room <= 0) return floor

    const fitted = Math.floor((room / advanceAtOne) * 2) / 2
    return Math.max(floor, Math.min(ceiling, fitted))
}
