import { randomUUID } from 'node:crypto'
import { Err, Ok, Result } from '@/shared/types/result'
import { DBClient, Article } from '@/shared/types/db'
import { serializeError } from '@/server/utils/serializeableError'
import { logger } from '@/server/utils/logger'
import { BUCKETS, STORAGE_PATHS, extractStoragePath } from '@/server/storage/storage.paths'
import { uploadFile, deleteFile } from '@/server/storage/storage.service'
import { insertMediaPost, deleteMediaPostById } from '@/server/db/mediaPost.repo'
import {
    findArticleMediaByArticleId,
    insertArticleMedia,
    updateArticleMedia,
    deleteArticleMediaById,
} from '@/server/db/articleMedia.repo'
import { findArticleById, updateArticle as updateArticleRow, findArticleSlugExists } from '@/server/db/article.repo'
import { slugify } from '../helpers/slugify'
import { UpdateArticleInput, UpdateArticleFields } from '../types'

export async function updateArticle(supabase: DBClient, p: UpdateArticleInput): Promise<Result<Article>> {
    try {
        const lookup = await findArticleById(supabase, p.articleId)
        if (!lookup.ok) return lookup
        if (!lookup.value) return Err({ message: 'Article not found', code: 'NOT_FOUND' })

        const fields: UpdateArticleFields = {}
        if (p.title !== undefined) fields.title = p.title
        if (p.body !== undefined)  fields.body = p.body
        if (p.slug) {
            const desired = slugify(p.slug)
            if (desired && desired !== lookup.value.slug) {
                const exists = await findArticleSlugExists(supabase, desired)
                if (!exists.ok) return exists
                if (exists.value) return Err({ message: 'That slug is already in use. Choose another.', code: 'VALIDATION_ERROR' })
                fields.slug = desired
            }
        }
        if (p.authorId !== undefined) fields.author_id = p.authorId
        if (p.matchId !== undefined)  fields.match_id = p.matchId
        if (p.seasonId !== undefined) fields.season_id = p.seasonId
        if (p.unpublish) fields.published_at = null

        const updated = await updateArticleRow(supabase, p.articleId, fields)
        if (!updated.ok) return updated
        const article = updated.value

        const existingRes = await findArticleMediaByArticleId(supabase, p.articleId)
        if (!existingRes.ok) return existingRes
        const existing = new Map(existingRes.value.map(m => [m.handle, m]))
        const usedHandles = new Set<string>()

        for (let idx = 0; idx < p.images.length; idx++) {
            const img = p.images[idx]
            usedHandles.add(img.handle)

            const ex = existing.get(img.handle)
            if (ex) {
                if (ex.sort_order !== idx) {
                    const upd = await updateArticleMedia(supabase, ex.id, { sort_order: idx })
                    if (!upd.ok) return upd
                }
                continue
            }

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
                    logger.error({ articleId: p.articleId, error: uploadRes.error }, 'Failed to upload article image')
                    return Err({ message: 'Failed to upload image', code: 'INTEGRATION_ERROR' })
                }

                const ins = await insertMediaPost(supabase, {
                    id:         newPostId,
                    type:       'article',
                    title:      article.title,
                    image_url:  uploadRes.value.url,
                    author_id:  article.author_id,
                    match_id:   article.match_id,
                    season_id:  article.season_id,
                    article_id: article.id,
                    created_by: p.userId,
                })
                if (!ins.ok) {
                    await deleteFile(supabase, { bucket: BUCKETS.MEDIA, path })
                    return ins
                }

                const link = await insertArticleMedia(supabase, {
                    articleId: article.id, mediaPostId: newPostId, handle: img.handle, sortOrder: idx,
                })
                if (!link.ok) {
                    await deleteFile(supabase, { bucket: BUCKETS.MEDIA, path })
                    await deleteMediaPostById(supabase, newPostId)
                    return link
                }
            } else if (img.kind === 'link' && img.mediaPostId) {
                const link = await insertArticleMedia(supabase, {
                    articleId: article.id, mediaPostId: img.mediaPostId, handle: img.handle, sortOrder: idx,
                })
                if (!link.ok) return link
            }
        }

        for (const ex of existingRes.value) {
            if (usedHandles.has(ex.handle)) continue
            const del = await deleteArticleMediaById(supabase, ex.id)
            if (!del.ok) return del
            if (ex.owner_article_id === article.id) {
                if (ex.image_url) {
                    await deleteFile(supabase, { bucket: BUCKETS.MEDIA, path: extractStoragePath(ex.image_url, BUCKETS.MEDIA) })
                }
                const delPost = await deleteMediaPostById(supabase, ex.media_post_id)
                if (!delPost.ok) return delPost
            }
        }

        return Ok(article)
    } catch (error) {
        return Err(serializeError(error))
    }
}
