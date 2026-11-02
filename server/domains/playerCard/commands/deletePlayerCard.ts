import { Err, Ok, Result } from '@/shared/types/result'
import { DBClient } from '@/shared/types/db'
import { serializeError } from '@/server/utils/serializeableError'
import { logger } from '@/server/utils/logger'
import { getSupabaseAdmin } from '@/server/supabase/admin'
import { BUCKETS } from '@/server/storage/storage.paths'
import { deletePlayerCard as deleteCard } from '@/server/db/playerCards.repo'
import { DeletePlayerCardInput } from '../types'

export async function deletePlayerCard(supabase: DBClient, p: DeletePlayerCardInput): Promise<Result<null>> {
    try {
        const deleted = await deleteCard(supabase, p)
        if (!deleted.ok) return deleted
        if (!deleted.value) return Err({ message: 'Card not found or not deletable', code: 'NOT_FOUND' })

        const { error } = await getSupabaseAdmin().storage.from(BUCKETS.PUBLIC).remove([deleted.value.image_path])
        if (error) logger.warn({ error, path: deleted.value.image_path }, 'deletePlayerCard: image cleanup failed')

        return Ok(null)
    } catch (error) {
        return Err(serializeError(error))
    }
}
