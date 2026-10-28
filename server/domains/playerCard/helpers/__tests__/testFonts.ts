import { readFile } from 'fs/promises'
import path from 'path'
import opentype from 'opentype.js'
import { CARD_FONTS, CardFontKey, CardFonts } from '../cardFont'

const GEIST = path.join(process.cwd(), 'node_modules', 'next', 'dist', 'compiled', '@vercel', 'og', 'Geist-Regular.ttf')

export async function loadTestFonts(): Promise<CardFonts> {
    const file = await readFile(GEIST)
    const data = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer
    const font = opentype.parse(data)
    const keys = Object.keys(CARD_FONTS) as CardFontKey[]
    return Object.fromEntries(keys.map(key => [key, { name: CARD_FONTS[key].name, data, font }])) as CardFonts
}
