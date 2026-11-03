import { Err, Ok, Result } from '@/shared/types/result'
import { DBClient } from '@/shared/types/db'
import { serializeError } from '@/server/utils/serializeableError'
import { logger } from '@/server/utils/logger'
import { getOverallConfig } from '@/server/domains/overall'
import type { OverallInputRow } from '@/server/domains/overall'
import { CardData, CardLayer, CardOverrides, CardSubject, CardTemplate, GenerateCustomPlayerCardInput } from '../types'
import { buildCardData, buildCustomCardData } from '../helpers/buildCardData'
import { resolveCustomSubject } from '../helpers/customSubject'
import { resolveCardTier } from '../helpers/resolveCardTier'
import { toCardTemplate } from '../helpers/toCardShapes'
import { loadTemplateArt } from '../helpers/loadTemplateArt'
import { loadCardFonts } from '../helpers/cardFont'
import { renderCard } from '../helpers/renderCard'
import { cardTemplateFileName } from './getCardTierTemplate'

type TemplateFile = { fileName: string; dataUri: string }

function isTemplateLayer(layer: CardLayer): boolean {
    return layer.kind === 'art' || layer.kind === 'stats' || (layer.kind === 'text' && layer.field === 'username')
}

export async function getPlayerCardTemplate(
    supabase: DBClient,
    p: { seasonNumber: number; groupId: string; subject: CardSubject; data: CardData },
): Promise<Result<TemplateFile>> {
    const resolved = await resolveCardTier(supabase, { groupId: p.groupId, ovr: p.data.ovr })
    if (!resolved.ok) return resolved

    const parsed = toCardTemplate(resolved.value.tier, resolved.value.group)
    if (!parsed.ok) return parsed
    if (!parsed.value.layers.some(layer => layer.kind === 'art')) {
        return Err({ message: `The ${resolved.value.group.name} layout has no art layer`, code: 'VALIDATION_ERROR' })
    }

    const template: CardTemplate = { ...parsed.value, layers: parsed.value.layers.filter(isTemplateLayer) }

    const art = await loadTemplateArt(template, { cached: false, allowMissing: false })
    if (!art.ok) return art

    const fonts = await loadCardFonts()
    if (!fonts.ok) return fonts

    const png = await renderCard(template, p.data, { art: art.value, headshot: null, teamLogo: null }, fonts.value)

    return Ok({
        fileName: cardTemplateFileName(resolved.value.group.name, p.data.username),
        dataUri: `data:image/png;base64,${png.toString('base64')}`,
    })
}

export async function getBoardPlayerCardTemplate(
    supabase: DBClient,
    p: { seasonNumber: number; groupId: string; player: OverallInputRow; overrides?: CardOverrides },
): Promise<Result<TemplateFile>> {
    try {
        const config = await getOverallConfig(supabase, p.seasonNumber)
        if (!config.ok) return config

        return await getPlayerCardTemplate(supabase, {
            seasonNumber: p.seasonNumber,
            groupId: p.groupId,
            subject: p.player,
            data: buildCardData(p.player, config.value, p.seasonNumber, p.overrides),
        })
    } catch (error) {
        logger.error({ error }, 'getBoardPlayerCardTemplate: unexpected error')
        return Err(serializeError(error))
    }
}

export async function getCustomPlayerCardTemplate(
    supabase: DBClient,
    p: GenerateCustomPlayerCardInput,
): Promise<Result<TemplateFile>> {
    try {
        const subject = await resolveCustomSubject(supabase, p)
        if (!subject.ok) return subject

        return await getPlayerCardTemplate(supabase, {
            seasonNumber: p.seasonNumber,
            groupId: p.groupId,
            subject: subject.value,
            data: buildCustomCardData(subject.value, p.values, p.seasonNumber),
        })
    } catch (error) {
        logger.error({ error }, 'getCustomPlayerCardTemplate: unexpected error')
        return Err(serializeError(error))
    }
}
