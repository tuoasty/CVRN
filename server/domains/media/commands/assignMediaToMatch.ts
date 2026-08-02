import { Err, Ok, Result } from '@/shared/types/result'
import { DBClient } from '@/shared/types/db'
import { serializeError } from '@/server/utils/serializeableError'
import { logger } from '@/server/utils/logger'
import { findMediaPostById, updateMediaPostMatch } from '@/server/db/mediaPost.repo'
import { assertMatchSlotFree } from '../helpers/assertMatchSlotFree'
import { AssignMediaToMatchInput, MatchMediaSlot, MediaPost } from '../types'

function toSlot(postType: string): MatchMediaSlot | null {
    return postType === 'gfx' || postType === 'video' ? postType : null
}

export async function assignMediaToMatch(
    supabase: DBClient,
    p: AssignMediaToMatchInput,
): Promise<Result<MediaPost>> {
    try {
        const lookup = await findMediaPostById(supabase, p.postId)
        if (!lookup.ok) return lookup

        const post = lookup.value
        if (!post) return Err({ message: 'Media post not found', code: 'NOT_FOUND' })

        if (p.matchId !== null) {
            const slot = toSlot(post.type)
            if (!slot) {
                return Err({ message: 'Only GFX and video posts can be attached to a match', code: 'VALIDATION_ERROR' })
            }

            const free = await assertMatchSlotFree(supabase, p.matchId, slot, post.id)
            if (!free.ok) return free
        }

        const updated = await updateMediaPostMatch(supabase, p.postId, p.matchId)
        if (!updated.ok) {
            logger.error({ postId: p.postId, matchId: p.matchId, error: updated.error }, 'Failed to assign media post to match')
            return updated
        }

        return Ok(updated.value)
    } catch (error) {
        return Err(serializeError(error))
    }
}
