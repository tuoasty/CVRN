import { Err, Ok, Result } from '@/shared/types/result'
import { DBClient } from '@/shared/types/db'
import { serializeError } from '@/server/utils/serializeableError'
import { findPublishedUpdateLogByVersion } from '@/server/db/updateLog.repo'
import { UpdateLogPublic } from '../types'

export async function getPublishedUpdateLog(supabase: DBClient, version: string): Promise<Result<UpdateLogPublic | null>> {
    try {
        const result = await findPublishedUpdateLogByVersion(supabase, version)
        if (!result.ok) return result
        const row = result.value
        if (!row) return Ok(null)
        return Ok({ version: row.version, title: row.title, body: row.body, released_at: row.released_at })
    } catch (error) {
        return Err(serializeError(error))
    }
}
