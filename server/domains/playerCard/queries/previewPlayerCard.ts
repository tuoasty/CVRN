import sharp from 'sharp'
import { Err, Ok, Result } from '@/shared/types/result'
import { DBClient } from '@/shared/types/db'
import { serializeError } from '@/server/utils/serializeableError'
import { logger } from '@/server/utils/logger'
import { findCardGroupById, findCardTemplateById } from '@/server/db/playerCards.repo'
import { getOverallConfig } from '@/server/domains/overall'
import type { OverallInputRow } from '@/server/domains/overall'
import { CardLayer, CardOverrides, CardTemplate } from '../types'
import { loadImageCached } from '../helpers/loadImage'
import { loadTemplateArt } from '../helpers/loadTemplateArt'
import { buildCardData } from '../helpers/buildCardData'
import { renderCard } from '../helpers/renderCard'
import { loadCardFonts } from '../helpers/cardFont'

const PREVIEW_MAX_WIDTH = 640

async function loadOptionalCached(url: string | null): Promise<string | null> {
    if (!url) return null
    const loaded = await loadImageCached(url)
    return loaded.ok ? loaded.value : null
}

export async function previewPlayerCard(
    supabase: DBClient,
    p: { seasonNumber: number; templateId: string; layers: CardLayer[]; player: OverallInputRow; overrides?: CardOverrides },
): Promise<Result<string>> {
    try {
        const row = await findCardTemplateById(supabase, p.templateId)
        if (!row.ok) return row
        if (!row.value) return Err({ message: 'Card template not found', code: 'NOT_FOUND' })

        const group = await findCardGroupById(supabase, row.value.group_id)
        if (!group.ok) return group
        if (!group.value) return Err({ message: 'Card group not found', code: 'NOT_FOUND' })

        const template: CardTemplate = {
            id: row.value.id,
            groupId: row.value.group_id,
            name: row.value.name,
            minOvr: row.value.min_ovr,
            width: group.value.canvas_width,
            height: group.value.canvas_height,
            layers: p.layers,
        }

        const config = await getOverallConfig(supabase, p.seasonNumber)
        if (!config.ok) return config
        const data = buildCardData(p.player, config.value, p.overrides)

        const art = await loadTemplateArt(template, { cached: true })
        if (!art.ok) return art

        const [headshot, teamLogo] = await Promise.all([
            loadOptionalCached(p.player.avatarUrl),
            loadOptionalCached(p.player.teamLogoUrl),
        ])

        const fonts = await loadCardFonts()
        if (!fonts.ok) return fonts

        const png = await renderCard(template, data, { art: art.value, headshot, teamLogo }, fonts.value)
        const webp = await sharp(png)
            .resize({ width: Math.min(PREVIEW_MAX_WIDTH, template.width), withoutEnlargement: true })
            .webp({ quality: 82 })
            .toBuffer()
        return Ok(`data:image/webp;base64,${webp.toString('base64')}`)
    } catch (error) {
        logger.error({ error }, 'previewPlayerCard: unexpected error')
        return Err(serializeError(error))
    }
}
