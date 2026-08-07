import { Err, Ok, Result } from '@/shared/types/result'
import { DBClient } from '@/shared/types/db'
import { serializeError } from '@/server/utils/serializeableError'
import { logger } from '@/server/utils/logger'
import { findAllMediaPosts } from '@/server/db/mediaPost.repo'
import { GetAllMediaInput, MediaPost } from '../types'

export async function getAllMediaPosts(supabase: DBClient, filters: GetAllMediaInput = {}): Promise<Result<MediaPost[]>> {
    try {
        const result = await findAllMediaPosts(supabase, {
            type:     filters.type,
            matchId:  filters.matchId,
            teamId:   filters.teamId,
            playerId: filters.playerId,
            seasonId: filters.seasonId,
        })
        if (!result.ok) {
            logger.error({ filters, error: result.error }, 'Failed to fetch media posts')
            return result
        }
        return Ok(result.value)
    } catch (error) {
        return Err(serializeError(error))
    }
}
