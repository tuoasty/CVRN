import { Err, Result } from '@/shared/types/result'
import { DBClient } from '@/shared/types/db'
import { serializeError } from '@/server/utils/serializeableError'
import { findPublishedUpdateLogIndex } from '@/server/db/updateLog.repo'
import { UpdateLogIndexEntry } from '../types'

export async function getPublishedUpdateLogIndex(supabase: DBClient): Promise<Result<UpdateLogIndexEntry[]>> {
    try {
        return await findPublishedUpdateLogIndex(supabase)
    } catch (error) {
        return Err(serializeError(error))
    }
}
