import { Err, Ok, Result } from '@/shared/types/result'
import { DBClient } from '@/shared/types/db'
import { serializeError } from '@/server/utils/serializeableError'
import { logger } from '@/server/utils/logger'
import { getSupabaseAdmin } from '@/server/supabase/admin'
import { BUCKETS, STORAGE_PATHS } from '@/server/storage/storage.paths'
import { toCdnUrl } from '@/server/storage/toCdnUrl'
import { findCardGroupById, findPlayerCardOverlay, upsertPlayerCardOverlay } from '@/server/db/playerCards.repo'
import { CARD_ART_MAX_BYTES, CardLayersSchema, PlayerCardRig } from '../types'
import { inspectCardArt, isFullyOpaque } from '../helpers/inspectCardArt'
import { hasRigLayer, NO_RIG_SEGMENT } from '../helpers/loadCardRig'
import { toPlayerCardRig } from '../helpers/toCardShapes'

export async function uploadPlayerCardRig(
    supabase: DBClient,
    p: {
        seasonNumber: number
        groupId: string
        file: File
        ensurePlayerId: () => Promise<Result<string>>
    },
): Promise<Result<PlayerCardRig>> {
    try {
        if (p.file.size > CARD_ART_MAX_BYTES) {
            return Err({ message: 'Rig must be 2.9 MB or smaller. Export a smaller PNG.', code: 'VALIDATION_ERROR' })
        }

        const group = await findCardGroupById(supabase, p.groupId)
        if (!group.ok) return group
        if (!group.value) return Err({ message: 'Card group not found', code: 'NOT_FOUND' })

        const layers = CardLayersSchema.safeParse(group.value.layers)
        if (!layers.success || !hasRigLayer(layers.data)) {
            return Err({ message: NO_RIG_SEGMENT, code: 'VALIDATION_ERROR' })
        }

        const png = Buffer.from(await p.file.arrayBuffer())
        const inspected = await inspectCardArt(png)
        if (!inspected.ok) return inspected

        const { width, height } = inspected.value

        if (await isFullyOpaque(png)) {
            return Err({ message: 'This PNG has no transparent background. Export only the rig, not the whole card.', code: 'VALIDATION_ERROR' })
        }

        const playerId = await p.ensurePlayerId()
        if (!playerId.ok) return playerId

        const key = { playerId: playerId.value, seasonNumber: p.seasonNumber, groupId: p.groupId, slot: 'rig' as const }
        const bucket = getSupabaseAdmin().storage.from(BUCKETS.PUBLIC)
        const path = STORAGE_PATHS.playerCardRig(key.playerId, key.seasonNumber, key.groupId)
        const { error: uploadError } = await bucket.upload(path, png, {
            contentType: 'image/png',
            cacheControl: '31536000',
            upsert: false,
        })
        if (uploadError) {
            logger.error({ error: uploadError, path }, 'uploadPlayerCardRig: upload failed')
            return Err(serializeError(uploadError, 'INTEGRATION_ERROR'))
        }

        const previous = await findPlayerCardOverlay(supabase, key)

        const saved = await upsertPlayerCardOverlay(supabase, {
            player_id: key.playerId,
            season_number: key.seasonNumber,
            group_id: key.groupId,
            slot: key.slot,
            image_path: path,
            image_url: toCdnUrl(bucket.getPublicUrl(path).data.publicUrl),
            width,
            height,
            image_x: null,
            image_y: null,
            image_w: null,
            uploaded_at: new Date().toISOString(),
        })
        if (!saved.ok) {
            await bucket.remove([path])
            return saved
        }

        const oldPath = previous.ok ? previous.value?.image_path : null
        if (oldPath && oldPath !== path) {
            const { error: removeError } = await bucket.remove([oldPath])
            if (removeError) logger.warn({ error: removeError, oldPath }, 'uploadPlayerCardRig: old rig cleanup failed')
        }

        return Ok(toPlayerCardRig(saved.value))
    } catch (error) {
        logger.error({ error }, 'uploadPlayerCardRig: unexpected error')
        return Err(serializeError(error))
    }
}
