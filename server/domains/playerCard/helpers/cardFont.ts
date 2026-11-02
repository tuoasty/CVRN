import opentype from 'opentype.js'
import { Err, Ok, Result } from '@/shared/types/result'
import { getSupabaseAdmin } from '@/server/supabase/admin'
import { BUCKETS } from '@/server/storage/storage.paths'
import { logger } from '@/server/utils/logger'
import type { CardTextLayer } from '../types'

export const CARD_FONTS = {
    bebas: { name: 'card-bebas-neue', file: 'BebasNeue-Regular.ttf' },
    teko: { name: 'card-teko-bold', file: 'Teko-Bold.ttf' },
    norms: { name: 'card-tt-norms', file: 'TTNormsPro-Regular.otf' },
    normsBold: { name: 'card-tt-norms-bold', file: 'TTNormsPro-Bold.otf' },
} as const

export const OVR_STROKE_RATIO = 0.04

export type CardFontKey = keyof typeof CARD_FONTS

export interface CardFont {
    name: string
    data: ArrayBuffer
    font: opentype.Font
}

export type CardFonts = Record<CardFontKey, CardFont>

export function fontKeyForField(field: CardTextLayer['field']): CardFontKey {
    if (field === 'username' || field === 'displayName') return 'bebas'
    if (field === 'ovr') return 'teko'
    return 'norms'
}

export function strokeRatioForField(field: CardTextLayer['field']): number {
    return field === 'ovr' ? OVR_STROKE_RATIO : 0
}

async function loadOne(key: CardFontKey): Promise<Result<CardFont>> {
    const { name, file } = CARD_FONTS[key]
    const { data, error } = await getSupabaseAdmin().storage.from(BUCKETS.CARD_FONTS).download(file)
    if (error || !data) {
        logger.error({ error, file }, 'loadCardFonts: download failed')
        return Err({ message: `Card font missing: upload ${file} to the ${BUCKETS.CARD_FONTS} bucket`, code: 'INTEGRATION_ERROR' })
    }
    try {
        const buffer = await data.arrayBuffer()
        return Ok({ name, data: buffer, font: opentype.parse(buffer) })
    } catch (error) {
        logger.error({ error, file }, 'loadCardFonts: parse failed')
        return Err({ message: `Card font ${file} is not a TTF, OTF or WOFF file`, code: 'VALIDATION_ERROR' })
    }
}

let cached: CardFonts | null = null

export async function loadCardFonts(): Promise<Result<CardFonts>> {
    if (cached) return Ok(cached)
    const keys = Object.keys(CARD_FONTS) as CardFontKey[]
    const loaded = await Promise.all(keys.map(loadOne))
    const fonts = {} as CardFonts
    for (const [i, result] of loaded.entries()) {
        if (!result.ok) return result
        fonts[keys[i]] = result.value
    }
    cached = fonts
    return Ok(fonts)
}
