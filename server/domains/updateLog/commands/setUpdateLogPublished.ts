import { Err, Ok, Result } from '@/shared/types/result'
import { DBClient } from '@/shared/types/db'
import { serializeError } from '@/server/utils/serializeableError'
import { findUpdateLogById, updateUpdateLogRow } from '@/server/db/updateLog.repo'
import { SetUpdateLogPublishedInput, UpdateLogAdminDetail } from '../types'
import { toUpdateLogAdminDetail } from '../helpers/toAdminShapes'

export async function setUpdateLogPublished(supabase: DBClient, p: SetUpdateLogPublishedInput): Promise<Result<UpdateLogAdminDetail>> {
    try {
        const lookup = await findUpdateLogById(supabase, p.updateLogId)
        if (!lookup.ok) return lookup
        if (!lookup.value) return Err({ message: 'Update log not found', code: 'NOT_FOUND' })

        const updated = await updateUpdateLogRow(supabase, p.updateLogId, {
            published_at: p.published ? new Date().toISOString() : null,
        })
        if (!updated.ok) return updated

        return Ok(toUpdateLogAdminDetail(updated.value))
    } catch (error) {
        return Err(serializeError(error))
    }
}
