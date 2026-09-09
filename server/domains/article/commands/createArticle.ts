import { randomUUID } from 'node:crypto'
import { Err, Ok, Result } from '@/shared/types/result'
import { DBClient, Article } from '@/shared/types/db'
import { serializeError } from '@/server/utils/serializeableError'
import { logger } from '@/server/utils/logger'
import { BUCKETS, STORAGE_PATHS } from '@/server/storage/storage.paths'
import { uploadFile, deleteFile } from '@/server/storage/storage.service'
import { insertMediaPost } from '@/server/db/mediaPost.repo'
import { insertArticleMedia } from '@/server/db/articleMedia.repo'
import { insertArticle, deleteArticleById, findArticleSlugExists } from '@/server/db/article.repo'
import { generateUniqueSlug, slugify } from '../helpers/slugify'
import { CreateArticleInput } from '../types'

export async function createArticle(supabase: DBClient, p: CreateArticleInput): Promise<Result<Article>> {
    const articleId = randomUUID()
    const uploadedPaths: string[] = []
    let articleInserted = false
    let success = false

    try {
        let slug: string
        if (p.slug && p.slug.trim()) {
            slug = slugify(p.slug)
            const exists = await findArticleSlugExists(supabase, slug)
            if (!exists.ok) return exists
            if (exists.value) return Err({ message: 'That slug is already in use. Choose another.', code: 'VALIDATION_ERROR' })
        } else {
            slug = await generateUniqueSlug(supabase, p.title)
        }
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

        for (let idx = 0; idx < p.images.length; idx++) {
            const img = p.images[idx]

            if (img.kind === 'upload' && img.file && img.file.size > 0) {
                const newPostId = randomUUID()
                const ext = img.file.name.split('.').pop() ?? 'jpg'
                const path = STORAGE_PATHS.mediaPost(newPostId, ext)

                const uploadRes = await uploadFile(supabase, {
                    bucket: BUCKETS.MEDIA,
                    path,
                    file: img.file,
                    contentType: img.file.type,
                    upsert: false,
                    compress: false,
                    userId: p.userId,
                })
                if (!uploadRes.ok) {
                    logger.error({ articleId, error: uploadRes.error }, 'Failed to upload article image')
                    return Err({ message: 'Failed to upload image', code: 'INTEGRATION_ERROR' })
                }
                uploadedPaths.push(path)

                const ins = await insertMediaPost(supabase, {
                    id:         newPostId,
                    type:       'article',
                    title:      p.title,
                    image_url:  uploadRes.value.url,
                    author_id:  p.authorId ?? null,
                    match_id:   p.matchId ?? null,
                    season_id:  p.seasonId ?? null,
                    article_id: articleId,
                    created_by: p.userId,
                })
                if (!ins.ok) return ins

                const link = await insertArticleMedia(supabase, {
                    articleId, mediaPostId: newPostId, handle: img.handle, placement: img.placement, sortOrder: idx,
                })
                if (!link.ok) return link
            } else if (img.kind === 'link' && img.mediaPostId) {
                const link = await insertArticleMedia(supabase, {
                    articleId, mediaPostId: img.mediaPostId, handle: img.handle, placement: img.placement, sortOrder: idx,
                })
                if (!link.ok) return link
            }
        }

        success = true
        return Ok(inserted.value)
    } catch (error) {
        return Err(serializeError(error))
    } finally {
        if (!success) {
            for (const path of uploadedPaths) await deleteFile(supabase, { bucket: BUCKETS.MEDIA, path })
            if (articleInserted) await deleteArticleById(supabase, articleId)
        }
    }
}
