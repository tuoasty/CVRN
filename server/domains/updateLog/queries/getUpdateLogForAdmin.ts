import { Err, Ok, Result } from '@/shared/types/result'
import { DBClient } from '@/shared/types/db'
import { serializeError } from '@/server/utils/serializeableError'
import { findUpdateLogById } from '@/server/db/updateLog.repo'
import { UpdateLogAdminDetail } from '../types'
import { toUpdateLogAdminDetail } from '../helpers/toAdminShapes'

export async function getUpdateLogForAdmin(supabase: DBClient, id: string): Promise<Result<UpdateLogAdminDetail>> {
    try {
        const result = await findUpdateLogById(supabase, id)
        if (!result.ok) return result
        if (!result.value) return Err({ message: 'Update log not found', code: 'NOT_FOUND' })
        return Ok(toUpdateLogAdminDetail(result.value))
    } catch (error) {
        return Err(serializeError(error))
    }
}
