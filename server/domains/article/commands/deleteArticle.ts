import { Err, Ok, Result } from '@/shared/types/result'
import { DBClient } from '@/shared/types/db'
import { serializeError } from '@/server/utils/serializeableError'
import { logger } from '@/server/utils/logger'
import { BUCKETS, extractStoragePath } from '@/server/storage/storage.paths'
import { deleteFile } from '@/server/storage/storage.service'
import { findMediaPostByArticleId } from '@/server/db/mediaPost.repo'
import { findArticleById, deleteArticleById } from '@/server/db/article.repo'
import { DeleteArticleInput } from '../types'

export async function deleteArticle(supabase: DBClient, p: DeleteArticleInput): Promise<Result<void>> {
    try {
        const lookup = await findArticleById(supabase, p.articleId)
        if (!lookup.ok) return lookup
        if (!lookup.value) return Err({ message: 'Article not found', code: 'NOT_FOUND' })

        const newsLookup = await findMediaPostByArticleId(supabase, p.articleId)
        if (newsLookup.ok && newsLookup.value?.image_url) {
            const path = extractStoragePath(newsLookup.value.image_url, BUCKETS.MEDIA)
            const delFile = await deleteFile(supabase, { bucket: BUCKETS.MEDIA, path })
            if (!delFile.ok) {
                logger.warn({ articleId: p.articleId, path, error: delFile.error }, 'Failed to delete article cover file; proceeding with DB delete')
            }
        }

        const delRow = await deleteArticleById(supabase, p.articleId)
        if (!delRow.ok) return delRow

        return Ok(undefined)
    } catch (error) {
        return Err(serializeError(error))
    }
}
