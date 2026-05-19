import { Err, Ok, Result } from '@/shared/types/result'
import { DBClient } from '@/shared/types/db'
import { serializeError } from '@/server/utils/serializeableError'
import { logger } from '@/server/utils/logger'
import { findMediaPostById } from '@/server/db/mediaPost.repo'
import { MediaPost } from '../types'

export async function getMediaPostById(supabase: DBClient, id: string): Promise<Result<MediaPost | null>> {
    try {
        const result = await findMediaPostById(supabase, id)
        if (!result.ok) {
            logger.error({ id, error: result.error }, 'Failed to fetch media post by id')
            return result
        }
        return Ok(result.value)
    } catch (error) {
        return Err(serializeError(error))
    }
}
