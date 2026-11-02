import { Err, Result } from '@/shared/types/result'
import { DBClient } from '@/shared/types/db'
import { serializeError } from '@/server/utils/serializeableError'
import { logger } from '@/server/utils/logger'
import { CARD_ART_MAX_BYTES, CardData, CardSubject, PlayerCard } from '../types'
import { inspectCardArt } from '../helpers/inspectCardArt'
import { resolveCardTier } from '../helpers/resolveCardTier'
import { saveCardImage } from '../helpers/saveCardImage'

export async function uploadPlayerCardGfx(
    supabase: DBClient,
    p: {
        seasonNumber: number
        groupId: string
        subject: CardSubject
        data: CardData
        file: File
        ensurePlayerId: () => Promise<Result<string>>
    },
): Promise<Result<PlayerCard>> {
    try {
        if (p.file.size > CARD_ART_MAX_BYTES) {
            return Err({ message: 'GFX must be 2.9 MB or smaller. It is stored as uploaded, so export a smaller PNG.', code: 'VALIDATION_ERROR' })
        }

        const resolved = await resolveCardTier(supabase, { groupId: p.groupId, ovr: p.data.ovr })
        if (!resolved.ok) return resolved
        const { group, tier } = resolved.value

        const png = Buffer.from(await p.file.arrayBuffer())
        const inspected = await inspectCardArt(png)
        if (!inspected.ok) return inspected

        const { width, height } = inspected.value
        if (width !== group.canvas_width || height !== group.canvas_height) {
            return Err({
                message: `GFX must be exactly ${group.canvas_width} × ${group.canvas_height}. This file is ${width} × ${height}.`,
                code: 'VALIDATION_ERROR',
            })
        }

        return await saveCardImage(supabase, {
            seasonNumber: p.seasonNumber,
            groupId: p.groupId,
            templateId: tier.id,
            subject: p.subject,
            data: p.data,
            png,
            ensurePlayerId: p.ensurePlayerId,
        })
    } catch (error) {
        logger.error({ error }, 'uploadPlayerCardGfx: unexpected error')
        return Err(serializeError(error))
    }
}
