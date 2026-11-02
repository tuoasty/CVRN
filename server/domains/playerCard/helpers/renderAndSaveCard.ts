import { Err, Ok, Result } from '@/shared/types/result'
import { DBClient } from '@/shared/types/db'
import { serializeError } from '@/server/utils/serializeableError'
import { logger } from '@/server/utils/logger'
import { getSupabaseAdmin } from '@/server/supabase/admin'
import { BUCKETS, STORAGE_PATHS } from '@/server/storage/storage.paths'
import { toCdnUrl } from '@/server/storage/toCdnUrl'
import { getRobloxLargeHeadshot } from '@/server/roblox/users'
import { findPlayerCard, upsertPlayerCard } from '@/server/db/playerCards.repo'
import { CardData, CardSubject, PlayerCard } from '../types'
import { resolveCardTier } from './resolveCardTier'
import { toCardTemplate, toPlayerCard } from './toCardShapes'
import { loadImageAsPngDataUri } from './loadImage'
import { loadTemplateArt } from './loadTemplateArt'
import { renderCard } from './renderCard'
import { loadCardFonts } from './cardFont'

async function resolveHeadshotUrl(subject: CardSubject): Promise<string | null> {
    const large = await getRobloxLargeHeadshot(subject.robloxUserId)
    if (large.ok && large.value) return large.value
    if (!large.ok) logger.warn({ robloxUserId: subject.robloxUserId, error: large.error }, 'renderAndSaveCard: large headshot failed, using stored avatar')
    return subject.avatarUrl
}

async function loadOptional(url: string | null): Promise<string | null> {
    if (!url) return null
    const loaded = await loadImageAsPngDataUri(url)
    return loaded.ok ? loaded.value : null
}

async function loadImages(subject: CardSubject): Promise<Result<{ headshot: string | null; teamLogo: string | null }>> {
    const [headshot, teamLogo] = await Promise.all([
        resolveHeadshotUrl(subject).then(loadOptional),
        loadOptional(subject.teamLogoUrl),
    ])
    return Ok({ headshot, teamLogo })
}

async function loadImagesStrict(subject: CardSubject): Promise<Result<{ headshot: string | null; teamLogo: string | null }>> {
    const noHeadshot = Err({ message: 'Roblox headshot unavailable', code: 'INTEGRATION_ERROR' as const })
    const large = await getRobloxLargeHeadshot(subject.robloxUserId)
    if (!large.ok || !large.value) return noHeadshot

    const [headshot, teamLogo] = await Promise.all([
        loadImageAsPngDataUri(large.value),
        subject.teamLogoUrl ? loadImageAsPngDataUri(subject.teamLogoUrl) : Promise.resolve(Ok(null)),
    ])
    if (!headshot.ok) return noHeadshot
    if (!teamLogo.ok) return Err({ message: 'Team logo could not be loaded', code: 'INTEGRATION_ERROR' })
    return Ok({ headshot: headshot.value, teamLogo: teamLogo.value })
}

export async function renderAndSaveCard(
    supabase: DBClient,
    p: {
        seasonNumber: number
        groupId: string
        subject: CardSubject
        data: CardData
        ensurePlayerId: () => Promise<Result<string>>
        strictImages?: boolean
        generatedBy?: string | null
    },
): Promise<Result<PlayerCard>> {
    const { seasonNumber, groupId, subject, data } = p

    const resolved = await resolveCardTier(supabase, { groupId, ovr: data.ovr })
    if (!resolved.ok) return resolved
    const template = toCardTemplate(resolved.value.tier, resolved.value.group)
    if (!template.ok) return template
    if (!template.value.layers.some(layer => layer.kind === 'art')) {
        return Err({ message: 'This layout has no art layer, so a card would have no background', code: 'VALIDATION_ERROR' })
    }

    const art = await loadTemplateArt(template.value, { cached: false, allowMissing: false })
    if (!art.ok) return art

    const images = await (p.strictImages ? loadImagesStrict(subject) : loadImages(subject))
    if (!images.ok) return images

    const fonts = await loadCardFonts()
    if (!fonts.ok) return fonts

    const png = await renderCard(template.value, data, { art: art.value, ...images.value }, fonts.value)

    const playerId = await p.ensurePlayerId()
    if (!playerId.ok) return playerId

    const admin = getSupabaseAdmin()
    const path = STORAGE_PATHS.playerCard(playerId.value, seasonNumber)
    const { error: uploadError } = await admin.storage
        .from(BUCKETS.PUBLIC)
        .upload(path, png, { contentType: 'image/png', cacheControl: '31536000', upsert: false })
    if (uploadError) {
        logger.error({ error: uploadError, path }, 'renderAndSaveCard: upload failed')
        return Err(serializeError(uploadError, 'INTEGRATION_ERROR'))
    }
    const imageUrl = toCdnUrl(admin.storage.from(BUCKETS.PUBLIC).getPublicUrl(path).data.publicUrl)

    const previous = await findPlayerCard(supabase, { playerId: playerId.value, seasonNumber, groupId })

    const saved = await upsertPlayerCard(supabase, {
        player_id: playerId.value,
        season_number: seasonNumber,
        group_id: groupId,
        template_id: template.value.id,
        ovr: data.ovr,
        ...data.attributes,
        position: data.position,
        team_id: subject.teamId,
        image_path: path,
        image_url: imageUrl,
        generated_at: new Date().toISOString(),
        ...(p.generatedBy !== undefined ? { generated_by: p.generatedBy } : {}),
    })
    if (!saved.ok) {
        await admin.storage.from(BUCKETS.PUBLIC).remove([path])
        return saved
    }

    const oldPath = previous.ok ? previous.value?.image_path : null
    if (oldPath && oldPath !== path) {
        const { error: removeError } = await admin.storage.from(BUCKETS.PUBLIC).remove([oldPath])
        if (removeError) logger.warn({ error: removeError, oldPath }, 'renderAndSaveCard: old card cleanup failed')
    }

    return Ok(toPlayerCard(saved.value))
}
