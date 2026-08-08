import { Err, Ok, Result } from '@/shared/types/result'
import { DBClient } from '@/shared/types/db'
import { serializeError } from '@/server/utils/serializeableError'
import { logger } from '@/server/utils/logger'
import { findMediaPostById, updateMediaPost as updateMediaPostRow } from '@/server/db/mediaPost.repo'
import { UpdateMediaPostInput, MediaPost } from '../types'

export async function updateMediaPost(supabase: DBClient, p: UpdateMediaPostInput): Promise<Result<MediaPost>> {
    try {
        const lookup = await findMediaPostById(supabase, p.postId)
        if (!lookup.ok) return lookup
        if (!lookup.value) return Err({ message: 'Media post not found', code: 'NOT_FOUND' })

        const fields: { title?: string; description?: string | null; author_id?: string | null } = {}
        if (p.title !== undefined) fields.title = p.title
        if (p.description !== undefined) fields.description = p.description
        if (p.authorId !== undefined) fields.author_id = p.authorId

        const updated = await updateMediaPostRow(supabase, p.postId, fields)
        if (!updated.ok) {
            logger.error({ postId: p.postId, error: updated.error }, 'Failed to update media post')
            return updated
        }
        return Ok(updated.value)
    } catch (error) {
        return Err(serializeError(error))
    }
}
