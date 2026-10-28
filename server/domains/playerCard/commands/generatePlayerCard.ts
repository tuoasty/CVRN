import { Err, Ok, Result } from '@/shared/types/result'
import { DBClient } from '@/shared/types/db'
import { serializeError } from '@/server/utils/serializeableError'
import { logger } from '@/server/utils/logger'
import { getSupabaseAdmin } from '@/server/supabase/admin'
import { BUCKETS, STORAGE_PATHS } from '@/server/storage/storage.paths'
import { toCdnUrl } from '@/server/storage/toCdnUrl'
import { getRobloxLargeHeadshot } from '@/server/roblox/users'
import { findCardGroupById, findCardTemplates, findPlayerCard, upsertPlayerCard } from '@/server/db/playerCards.repo'
import { computeOverall, getOverallConfig, NEUTRAL_SCALING } from '@/server/domains/overall'
import type { OverallInputRow } from '@/server/domains/overall'
import { CardData, PlayerCard } from '../types'
import { pickTierTemplate, resolveArtLocation, toCardTemplate, toPlayerCard } from '../helpers/toCardShapes'
import { loadImageAsPngDataUri } from '../helpers/loadImage'
import { CardAssets, renderCard } from '../helpers/renderCard'

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
    p: { seasonNumber: number; groupId: string; player: OverallInputRow },
): Promise<Result<PlayerCard>> {
    try {
        const { seasonNumber, groupId, player } = p

        const group = await findCardGroupById(supabase, groupId)
        if (!group.ok) return group
        if (!group.value) return Err({ message: 'Card group not found', code: 'NOT_FOUND' })

        const config = await getOverallConfig(supabase, seasonNumber)
        if (!config.ok) return config
        const scaling = player.position ? config.value.scalings[player.position] : NEUTRAL_SCALING
        const computed = computeOverall(player.ranks, scaling, player.setsPlayed)
        const ovr = config.value.overrides[player.playerId] ?? computed.ovr

        const templateRows = await findCardTemplates(supabase, groupId)
        if (!templateRows.ok) return templateRows
        const templateRow = pickTierTemplate(templateRows.value.map(row => ({ row, tier: row.tier, minOvr: row.min_ovr })), ovr)?.row
        if (!templateRow) {
            return Err({ message: `${group.value.name} has no tier for OVR ${ovr}`, code: 'NOT_FOUND' })
        }
        const template = toCardTemplate(templateRow, group.value.slug)
        if (!template.ok) return template

        const admin = getSupabaseAdmin()
        const artUrls = new Map<string, string>()
        for (const layer of template.value.layers) {
            if (layer.kind !== 'art' || artUrls.has(layer.src)) continue
            const location = resolveArtLocation(layer.src, group.value.slug, template.value.tier)
            artUrls.set(layer.src, 'url' in location
                ? location.url
                : toCdnUrl(admin.storage.from(BUCKETS.PUBLIC).getPublicUrl(location.path).data.publicUrl))
        }

        const art: Record<string, string> = {}
        for (const [src, url] of artUrls) {
            const loaded = await loadImageAsPngDataUri(url)
            if (!loaded.ok) return Err({ message: `Card template art could not be loaded: ${src}`, code: 'INTEGRATION_ERROR' })
            art[src] = loaded.value
        }

        const [headshot, teamLogo] = await Promise.all([
            resolveHeadshotUrl(player).then(loadOptional),
            loadOptional(player.teamLogoUrl),
        ])
        const assets: CardAssets = { art, headshot, teamLogo }

        const data: CardData = {
            username: player.username,
            displayName: player.displayName,
            ovr,
            position: player.position,
            teamName: player.teamName,
            attributes: computed.attributes,
        }

        const png = await renderCard(template.value, data, assets)

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
            ovr,
            ...computed.attributes,
            position: player.position,
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
