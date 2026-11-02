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

export interface FitRun {
    text: string
    font: opentype.Font
}

export function measureTextWidth(text: string, font: opentype.Font, size: number, letterSpacing: number): number {
    return font.getAdvanceWidth(text, size, { kerning: false }) + letterSpacing * [...text].length
}

export function fitRunsFontSize(
    runs: FitRun[],
    { width, height, maxSize, minSize, letterSpacing }: Omit<FitFontSizeInput, 'text' | 'font'>,
): number {
    const ceiling = Math.min(maxSize, height)
    const floor = Math.min(minSize, ceiling)
    const chars = runs.reduce((n, run) => n + [...run.text].length, 0)
    if (chars === 0) return ceiling

    const advanceAtOne = runs.reduce((sum, run) => sum + run.font.getAdvanceWidth(run.text, 1, { kerning: false }), 0)
    if (advanceAtOne <= 0) return ceiling

    const room = width - letterSpacing * chars
    if (room <= 0) return floor

    const fitted = Math.floor((room / advanceAtOne) * 2) / 2
    return Math.max(floor, Math.min(ceiling, fitted))
}

export function fitFontSize({ text, font, ...box }: FitFontSizeInput): number {
    return fitRunsFontSize([{ text, font }], box)
}
