import { randomUUID } from 'node:crypto'
import { Err, Ok, Result } from '@/shared/types/result'
import { DBClient, Article } from '@/shared/types/db'
import { serializeError } from '@/server/utils/serializeableError'
import { logger } from '@/server/utils/logger'
import { BUCKETS, STORAGE_PATHS, extractStoragePath } from '@/server/storage/storage.paths'
import { uploadFile, deleteFile } from '@/server/storage/storage.service'
import {
    insertMediaPost,
    findMediaPostByArticleId,
    updateMediaPostFields,
    deleteMediaPostById,
} from '@/server/db/mediaPost.repo'
import { findArticleById, updateArticle as updateArticleRow } from '@/server/db/article.repo'
import { UpdateArticleInput, UpdateArticleFields } from '../types'

export async function updateArticle(supabase: DBClient, p: UpdateArticleInput): Promise<Result<Article>> {
    try {
        const lookup = await findArticleById(supabase, p.articleId)
        if (!lookup.ok) return lookup
        if (!lookup.value) return Err({ message: 'Article not found', code: 'NOT_FOUND' })

        const fields: UpdateArticleFields = {}
        if (p.title !== undefined)    fields.title = p.title
        if (p.body !== undefined)     fields.body = p.body
        if (p.authorId !== undefined) fields.author_id = p.authorId
        if (p.matchId !== undefined)  fields.match_id = p.matchId
        if (p.seasonId !== undefined) fields.season_id = p.seasonId

        const updated = await updateArticleRow(supabase, p.articleId, fields)
        if (!updated.ok) return updated

        const article = updated.value
        const newsLookup = await findMediaPostByArticleId(supabase, p.articleId)
        if (!newsLookup.ok) return newsLookup
        const news = newsLookup.value

        if (p.removeCover && news) {
            if (news.image_url) {
                await deleteFile(supabase, { bucket: BUCKETS.MEDIA, path: extractStoragePath(news.image_url, BUCKETS.MEDIA) })
            }
            const del = await deleteMediaPostById(supabase, news.id)
            if (!del.ok) return del
            return Ok(article)
        }

        if (p.imageFile && p.imageFile.size > 0) {
            const targetId = news?.id ?? randomUUID()
            const ext = p.imageFile.name.split('.').pop() ?? 'jpg'
            const path = STORAGE_PATHS.mediaPost(targetId, ext)

            const uploadRes = await uploadFile(supabase, {
                bucket: BUCKETS.MEDIA,
                path,
                file: p.imageFile,
                contentType: p.imageFile.type,
                upsert: true,
                compress: false,
                userId: p.userId,
            })
            if (!uploadRes.ok) {
                logger.error({ articleId: p.articleId, error: uploadRes.error }, 'Failed to upload article cover')
                return Err({ message: 'Failed to upload cover image', code: 'INTEGRATION_ERROR' })
            }

            if (news) {
                if (news.image_url && extractStoragePath(news.image_url, BUCKETS.MEDIA) !== path) {
                    await deleteFile(supabase, { bucket: BUCKETS.MEDIA, path: extractStoragePath(news.image_url, BUCKETS.MEDIA) })
                }
                const upd = await updateMediaPostFields(supabase, news.id, {
                    title:      article.title,
                    image_url:  uploadRes.value.url,
                    author_id:  article.author_id,
                    match_id:   article.match_id,
                    season_id:  article.season_id,
                })
                if (!upd.ok) return upd
            } else {
                const ins = await insertMediaPost(supabase, {
                    id:         targetId,
                    type:       'news',
                    title:      article.title,
                    image_url:  uploadRes.value.url,
                    author_id:  article.author_id,
                    match_id:   article.match_id,
                    season_id:  article.season_id,
                    article_id: article.id,
                    created_by: p.userId,
                })
                if (!ins.ok) return ins
            }
            return Ok(article)
        }

        if (news) {
            const upd = await updateMediaPostFields(supabase, news.id, {
                title:     article.title,
                author_id: article.author_id,
                match_id:  article.match_id,
                season_id: article.season_id,
            })
            if (!upd.ok) return upd
        }

        return Ok(article)
    } catch (error) {
        return Err(serializeError(error))
    }
}
