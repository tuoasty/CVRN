import { Err, Ok, Result } from '@/shared/types/result'
import { DBClient } from '@/shared/types/db'
import { serializeError } from '@/server/utils/serializeableError'
import { logger } from '@/server/utils/logger'
import { getSupabaseAdmin } from '@/server/supabase/admin'
import { BUCKETS } from '@/server/storage/storage.paths'
import { deletePlayerCardOverlay } from '@/server/db/playerCards.repo'
import { PlayerCardRigKey } from '../types'

export async function deletePlayerCardRig(supabase: DBClient, p: PlayerCardRigKey): Promise<Result<null>> {
    try {
        const deleted = await deletePlayerCardOverlay(supabase, { ...p, slot: 'rig' })
        if (!deleted.ok) return deleted
        if (!deleted.value) return Err({ message: 'This player has no rig for this season and group', code: 'NOT_FOUND' })

        const { error } = await getSupabaseAdmin().storage.from(BUCKETS.PUBLIC).remove([deleted.value.image_path])
        if (error) logger.warn({ error, path: deleted.value.image_path }, 'deletePlayerCardRig: file cleanup failed')

        return Ok(null)
    } catch (error) {
        logger.error({ error }, 'deletePlayerCardRig: unexpected error')
        return Err(serializeError(error))
    }
}
