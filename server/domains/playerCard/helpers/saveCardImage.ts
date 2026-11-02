import { Err, Ok, Result } from '@/shared/types/result'
import { DBClient } from '@/shared/types/db'
import { serializeError } from '@/server/utils/serializeableError'
import { logger } from '@/server/utils/logger'
import { getSupabaseAdmin } from '@/server/supabase/admin'
import { BUCKETS, STORAGE_PATHS } from '@/server/storage/storage.paths'
import { toCdnUrl } from '@/server/storage/toCdnUrl'
import { findPlayerCard, upsertPlayerCard } from '@/server/db/playerCards.repo'
import { CardData, CardSubject, PlayerCard } from '../types'
import { toPlayerCard } from './toCardShapes'

export async function saveCardImage(
    supabase: DBClient,
    p: {
        seasonNumber: number
        groupId: string
        templateId: string
        subject: CardSubject
        data: CardData
        png: Buffer
        ensurePlayerId: () => Promise<Result<string>>
        generatedBy?: string | null
    },
): Promise<Result<PlayerCard>> {
    const { seasonNumber, groupId, templateId, subject, data, png } = p

    const playerId = await p.ensurePlayerId()
    if (!playerId.ok) return playerId

    const admin = getSupabaseAdmin()
    const path = STORAGE_PATHS.playerCard(playerId.value, seasonNumber)
    const { error: uploadError } = await admin.storage
        .from(BUCKETS.PUBLIC)
        .upload(path, png, { contentType: 'image/png', cacheControl: '31536000', upsert: false })
    if (uploadError) {
        logger.error({ error: uploadError, path }, 'saveCardImage: upload failed')
        return Err(serializeError(uploadError, 'INTEGRATION_ERROR'))
    }
    const imageUrl = toCdnUrl(admin.storage.from(BUCKETS.PUBLIC).getPublicUrl(path).data.publicUrl)

    const previous = await findPlayerCard(supabase, { playerId: playerId.value, seasonNumber, groupId })

    const saved = await upsertPlayerCard(supabase, {
        player_id: playerId.value,
        season_number: seasonNumber,
        group_id: groupId,
        template_id: templateId,
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
        if (removeError) logger.warn({ error: removeError, oldPath }, 'saveCardImage: old card cleanup failed')
    }

    return Ok(toPlayerCard(saved.value))
}
