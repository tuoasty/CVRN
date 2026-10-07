import { Err, Ok, Result } from '@/shared/types/result'
import { DBClient } from '@/shared/types/db'
import { serializeError } from '@/server/utils/serializeableError'
import { findAllUpdateLogs } from '@/server/db/updateLog.repo'
import { UpdateLogListItem } from '../types'
import { toUpdateLogListItem } from '../helpers/toAdminShapes'

export async function getUpdateLogsForAdmin(supabase: DBClient): Promise<Result<UpdateLogListItem[]>> {
    try {
        const result = await findAllUpdateLogs(supabase)
        if (!result.ok) return result
        return Ok(result.value.map(toUpdateLogListItem))
    } catch (error) {
        return Err(serializeError(error))
    }
}
