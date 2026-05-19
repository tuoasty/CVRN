import { Err, Ok, Result } from '@/shared/types/result'
import { DBClient } from '@/shared/types/db'
import { serializeError } from '@/server/utils/serializeableError'
import { logger } from '@/server/utils/logger'
import { BUCKETS, extractStoragePath } from '@/server/storage/storage.paths'
import { deleteFile } from '@/server/storage/storage.service'
import { findMediaPostById, deleteMediaPostById } from '@/server/db/mediaPost.repo'
import { DeleteMediaInput } from '../types'

export async function deleteMediaPost(supabase: DBClient, p: DeleteMediaInput): Promise<Result<void>> {
    try {
        const lookup = await findMediaPostById(supabase, p.postId)
        if (!lookup.ok) return lookup

        const post = lookup.value
        if (!post) return Err({ message: 'Media post not found', code: 'NOT_FOUND' })

        if (post.image_url) {
            const path = extractStoragePath(post.image_url, BUCKETS.MEDIA)
            const delFile = await deleteFile(supabase, { bucket: BUCKETS.MEDIA, path })
            if (!delFile.ok) {
                logger.warn({ postId: p.postId, path, error: delFile.error }, 'Failed to delete media file; proceeding with DB delete')
            }
        }

        const delRow = await deleteMediaPostById(supabase, p.postId)
        if (!delRow.ok) {
            logger.error({ postId: p.postId, error: delRow.error }, 'Failed to delete media post row')
            return delRow
        }

        return Ok(undefined)
    } catch (error) {
        return Err(serializeError(error))
    }
}
