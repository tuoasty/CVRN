import { Err, Ok, Result } from '@/shared/types/result'
import { DBClient } from '@/shared/types/db'
import { serializeError } from '@/server/utils/serializeableError'
import { findUpdateLogById, findUpdateLogVersionExists, updateUpdateLogRow } from '@/server/db/updateLog.repo'
import { UpdateUpdateLogInput, UpdateLogAdminDetail } from '../types'
import { toUpdateLogAdminDetail } from '../helpers/toAdminShapes'

export async function updateUpdateLog(supabase: DBClient, p: UpdateUpdateLogInput): Promise<Result<UpdateLogAdminDetail>> {
    try {
        const lookup = await findUpdateLogById(supabase, p.updateLogId)
        if (!lookup.ok) return lookup
        if (!lookup.value) return Err({ message: 'Update log not found', code: 'NOT_FOUND' })

        if (p.version !== lookup.value.version) {
            const exists = await findUpdateLogVersionExists(supabase, p.version, p.updateLogId)
            if (!exists.ok) return exists
            if (exists.value) return Err({ message: 'That version already has an update log. Choose another.', code: 'UPDATE_LOG_VERSION_TAKEN' })
        }

        const updated = await updateUpdateLogRow(supabase, p.updateLogId, {
            version:     p.version,
            title:       p.title,
            body:        p.body,
            released_at: p.releasedAt,
        })
        if (!updated.ok) return updated

        return Ok(toUpdateLogAdminDetail(updated.value))
    } catch (error) {
        return Err(serializeError(error))
    }
}
