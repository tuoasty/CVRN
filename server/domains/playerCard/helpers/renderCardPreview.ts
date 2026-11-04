import sharp from 'sharp'
import { Err, Ok, Result } from '@/shared/types/result'
import { DBClient } from '@/shared/types/db'
import { findCardGroupById, findCardTemplateById } from '@/server/db/playerCards.repo'
import { CardData, CardLayer, CardTemplate, RigPlacement } from '../types'
import { loadImageCached } from './loadImage'
import { loadTemplateArt } from './loadTemplateArt'
import { renderCard } from './renderCard'
import { loadCardFonts } from './cardFont'
import { loadCardRig } from './loadCardRig'

const PREVIEW_MAX_WIDTH = 640

async function loadOptionalCached(url: string | null): Promise<string | null> {
    if (!url) return null
    const loaded = await loadImageCached(url)
    return loaded.ok ? loaded.value : null
}

export async function renderCardPreview(
    supabase: DBClient,
    p: {
        templateId: string
        layers: CardLayer[]
        avatarUrl: string | null
        teamLogoUrl: string | null
        data: CardData
        rigPlayerId: string | null
        seasonNumber: number
        rigPlacement?: RigPlacement | null
    },
): Promise<Result<string>> {
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

    const art = await loadTemplateArt(template, { cached: true, allowMissing: true })
    if (!art.ok) return art

    const rig = await loadCardRig(supabase, {
        playerId: p.rigPlayerId,
        seasonNumber: p.seasonNumber,
        groupId: template.groupId,
        layers: p.layers,
        cached: true,
        placement: p.rigPlacement,
    })
    if (!rig.ok) return rig

    const [headshot, teamLogo] = await Promise.all([
        loadOptionalCached(p.avatarUrl),
        loadOptionalCached(p.teamLogoUrl),
    ])

    const fonts = await loadCardFonts()
    if (!fonts.ok) return fonts

    const png = await renderCard(template, p.data, { art: art.value, headshot, teamLogo, rig: rig.value }, fonts.value)
    const webp = await sharp(png)
        .resize({ width: Math.min(PREVIEW_MAX_WIDTH, template.width), withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer()
    return Ok(`data:image/webp;base64,${webp.toString('base64')}`)
}
