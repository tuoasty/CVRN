import { Err, Ok, Result } from '@/shared/types/result'
import { DBClient } from '@/shared/types/db'
import { serializeError } from '@/server/utils/serializeableError'
import { insertUpdateLog, findUpdateLogVersionExists } from '@/server/db/updateLog.repo'
import { CreateUpdateLogInput, UpdateLogAdminDetail } from '../types'
import { toUpdateLogAdminDetail } from '../helpers/toAdminShapes'

export async function createUpdateLog(supabase: DBClient, p: CreateUpdateLogInput): Promise<Result<UpdateLogAdminDetail>> {
    try {
        const exists = await findUpdateLogVersionExists(supabase, p.version)
        if (!exists.ok) return exists
        if (exists.value) return Err({ message: 'That version already has an update log. Choose another.', code: 'UPDATE_LOG_VERSION_TAKEN' })

        const inserted = await insertUpdateLog(supabase, {
            version:     p.version,
            title:       p.title,
            body:        p.body,
            released_at: p.releasedAt,
            created_by:  p.userId,
        })
        if (!inserted.ok) return inserted

        return Ok(toUpdateLogAdminDetail(inserted.value))
    } catch (error) {
        return Err(serializeError(error))
    }
}
