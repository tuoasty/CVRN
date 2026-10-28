import { Err, Ok, Result } from '@/shared/types/result'
import { DBClient } from '@/shared/types/db'
import { serializeError } from '@/server/utils/serializeableError'
import { logger } from '@/server/utils/logger'
import { getSupabaseAdmin } from '@/server/supabase/admin'
import { BUCKETS, STORAGE_PATHS } from '@/server/storage/storage.paths'
import { toCdnUrl } from '@/server/storage/toCdnUrl'
import { getRobloxLargeHeadshot } from '@/server/roblox/users'
import { findCardGroupById, findCardTemplates, findPlayerCard, upsertPlayerCard } from '@/server/db/playerCards.repo'
import { getOverallConfig } from '@/server/domains/overall'
import type { OverallInputRow } from '@/server/domains/overall'
import { CardOverrides, PlayerCard } from '../types'
import { pickTierTemplate, toCardTemplate, toPlayerCard } from '../helpers/toCardShapes'
import { loadImageAsPngDataUri } from '../helpers/loadImage'
import { loadTemplateArt } from '../helpers/loadTemplateArt'
import { buildCardData } from '../helpers/buildCardData'
import { renderCard } from '../helpers/renderCard'

async function resolveHeadshotUrl(player: OverallInputRow): Promise<string | null> {
    const large = await getRobloxLargeHeadshot(player.robloxUserId)
    if (large.ok && large.value) return large.value
    if (!large.ok) logger.warn({ playerId: player.playerId, error: large.error }, 'generatePlayerCard: large headshot failed, using stored avatar')
    return player.avatarUrl
}

async function loadOptional(url: string | null): Promise<string | null> {
    if (!url) return null
    const loaded = await loadImageAsPngDataUri(url)
    return loaded.ok ? loaded.value : null
}

export async function generatePlayerCard(
    supabase: DBClient,
    p: { seasonNumber: number; groupId: string; player: OverallInputRow; overrides?: CardOverrides },
): Promise<Result<PlayerCard>> {
    try {
        const { seasonNumber, groupId, player } = p

        const group = await findCardGroupById(supabase, groupId)
        if (!group.ok) return group
        if (!group.value) return Err({ message: 'Card group not found', code: 'NOT_FOUND' })

        const config = await getOverallConfig(supabase, seasonNumber)
        if (!config.ok) return config
        const data = buildCardData(player, config.value, p.overrides)

        const templateRows = await findCardTemplates(supabase, groupId)
        if (!templateRows.ok) return templateRows
        const templateRow = pickTierTemplate(templateRows.value.map(row => ({ row, tier: row.tier, minOvr: row.min_ovr })), data.ovr)?.row
        if (!templateRow) {
            return Err({ message: `${group.value.name} has no tier for OVR ${data.ovr}`, code: 'NOT_FOUND' })
        }
        const template = toCardTemplate(templateRow, group.value.slug)
        if (!template.ok) return template

        const art = await loadTemplateArt(template.value, { cached: false })
        if (!art.ok) return art

        const [headshot, teamLogo] = await Promise.all([
            resolveHeadshotUrl(player).then(loadOptional),
            loadOptional(player.teamLogoUrl),
        ])

        const png = await renderCard(template.value, data, { art: art.value, headshot, teamLogo })

        const admin = getSupabaseAdmin()
        const path = STORAGE_PATHS.playerCard(player.playerId, seasonNumber)
        const { error: uploadError } = await admin.storage
            .from(BUCKETS.PUBLIC)
            .upload(path, png, { contentType: 'image/png', cacheControl: '31536000', upsert: false })
        if (uploadError) {
            logger.error({ error: uploadError, path }, 'generatePlayerCard: upload failed')
            return Err(serializeError(uploadError, 'INTEGRATION_ERROR'))
        }
        const imageUrl = toCdnUrl(admin.storage.from(BUCKETS.PUBLIC).getPublicUrl(path).data.publicUrl)

        const previous = await findPlayerCard(supabase, { playerId: player.playerId, seasonNumber, groupId })

        const saved = await upsertPlayerCard(supabase, {
            player_id: player.playerId,
            season_number: seasonNumber,
            group_id: groupId,
            template_id: template.value.id,
            ovr: data.ovr,
            ...data.attributes,
            position: data.position,
            team_id: player.teamId,
            image_path: path,
            image_url: imageUrl,
            generated_at: new Date().toISOString(),
        })
        if (!saved.ok) {
            await admin.storage.from(BUCKETS.PUBLIC).remove([path])
            return saved
        }

        const oldPath = previous.ok ? previous.value?.image_path : null
        if (oldPath && oldPath !== path) {
            const { error: removeError } = await admin.storage.from(BUCKETS.PUBLIC).remove([oldPath])
            if (removeError) logger.warn({ error: removeError, oldPath }, 'generatePlayerCard: old card cleanup failed')
        }

        return Ok(toPlayerCard(saved.value))
    } catch (error) {
        logger.error({ error }, 'generatePlayerCard: unexpected error')
        return Err(serializeError(error))
    }
}
