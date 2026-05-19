import { Err, Ok, Result } from '@/shared/types/result'
import { DBClient } from '@/shared/types/db'
import { serializeError } from '@/server/utils/serializeableError'
import { logger } from '@/server/utils/logger'
import { findRecentMediaPosts } from '@/server/db/mediaPost.repo'
import { MediaPost } from '../types'

export async function getRecentMediaPosts(supabase: DBClient, limit = 4): Promise<Result<MediaPost[]>> {
    try {
        const result = await findRecentMediaPosts(supabase, limit)
        if (!result.ok) {
            logger.error({ limit, error: result.error }, 'Failed to fetch recent media posts')
            return result
        }
        return Ok(result.value)
    } catch (error) {
        return Err(serializeError(error))
    }
}
