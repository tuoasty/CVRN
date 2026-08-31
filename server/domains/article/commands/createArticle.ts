import { randomUUID } from 'node:crypto'
import { Err, Ok, Result } from '@/shared/types/result'
import { DBClient, Article } from '@/shared/types/db'
import { serializeError } from '@/server/utils/serializeableError'
import { logger } from '@/server/utils/logger'
import { BUCKETS, STORAGE_PATHS } from '@/server/storage/storage.paths'
import { uploadFile, deleteFile } from '@/server/storage/storage.service'
import { insertMediaPost } from '@/server/db/mediaPost.repo'
import { insertArticle, deleteArticleById } from '@/server/db/article.repo'
import { generateUniqueSlug } from '../helpers/slugify'
import { CreateArticleInput } from '../types'

export async function createArticle(supabase: DBClient, p: CreateArticleInput): Promise<Result<Article>> {
    const articleId = randomUUID()
    const newsPostId = randomUUID()
    let uploadedPath: string | null = null
    let articleInserted = false
    let success = false

    try {
        const slug = await generateUniqueSlug(supabase, p.title)
        const publishedAt = p.published ? new Date().toISOString() : null

        const inserted = await insertArticle(supabase, {
            id:          articleId,
            slug,
            title:       p.title,
            body:        p.body,
            author_id:   p.authorId ?? null,
            match_id:    p.matchId ?? null,
            season_id:   p.seasonId ?? null,
            published_at: publishedAt,
            created_by:  p.userId,
        })
        if (!inserted.ok) {
            logger.error({ articleId, error: inserted.error }, 'Failed to insert article')
            return inserted
        }
        articleInserted = true

        if (p.imageFile && p.imageFile.size > 0) {
            const ext = p.imageFile.name.split('.').pop() ?? 'jpg'
            const path = STORAGE_PATHS.mediaPost(newsPostId, ext)

            const uploadRes = await uploadFile(supabase, {
                bucket: BUCKETS.MEDIA,
                path,
                file: p.imageFile,
                contentType: p.imageFile.type,
                upsert: false,
                compress: false,
                userId: p.userId,
            })
            if (!uploadRes.ok) {
                logger.error({ articleId, error: uploadRes.error }, 'Failed to upload article cover')
                return Err({ message: 'Failed to upload cover image', code: 'INTEGRATION_ERROR' })
            }
            uploadedPath = path

            const newsRes = await insertMediaPost(supabase, {
                id:         newsPostId,
                type:       'news',
                title:      p.title,
                image_url:  uploadRes.value.url,
                author_id:  p.authorId ?? null,
                match_id:   p.matchId ?? null,
                season_id:  p.seasonId ?? null,
                article_id: articleId,
                created_by: p.userId,
            })
            if (!newsRes.ok) {
                logger.error({ articleId, error: newsRes.error }, 'Failed to insert article news post')
                return newsRes
            }
        }

        success = true
        return Ok(inserted.value)
    } catch (error) {
        return Err(serializeError(error))
    } finally {
        if (!success) {
            if (uploadedPath) await deleteFile(supabase, { bucket: BUCKETS.MEDIA, path: uploadedPath })
            if (articleInserted) await deleteArticleById(supabase, articleId)
        }
    }
}
