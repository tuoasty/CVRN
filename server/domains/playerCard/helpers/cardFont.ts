import { readFile } from 'fs/promises'
import path from 'path'
import opentype from 'opentype.js'

export const CARD_FONT_FAMILY = 'card'

export interface CardFont {
    data: ArrayBuffer
    font: opentype.Font
}

const DEFAULT_FONT_PATH = path.join(process.cwd(), 'node_modules', 'next', 'dist', 'compiled', '@vercel', 'og', 'Geist-Regular.ttf')

let cached: Promise<CardFont> | null = null

async function load(): Promise<CardFont> {
    const file = await readFile(DEFAULT_FONT_PATH)
    const data = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer
    return { data, font: opentype.parse(data) }
}

export function loadCardFont(): Promise<CardFont> {
    if (!cached) cached = load().catch(error => {
        cached = null
        throw error
    })
    return cached
}
