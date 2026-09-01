import { Err, Ok, Result } from '@/shared/types/result'
import { DBClient, Article } from '@/shared/types/db'
import { serializeError } from '@/server/utils/serializeableError'
import { findMediaPostByArticleId, updateMediaPostFields } from '@/server/db/mediaPost.repo'
import { updateArticle as updateArticleRow } from '@/server/db/article.repo'
import { SetArticlePublishedInput } from '../types'

export async function setArticlePublished(supabase: DBClient, p: SetArticlePublishedInput): Promise<Result<Article>> {
    try {
        const publishedAt = p.published ? new Date().toISOString() : null

        const updated = await updateArticleRow(supabase, p.articleId, { published_at: publishedAt })
        if (!updated.ok) return updated

        const news = await findMediaPostByArticleId(supabase, p.articleId)
        if (news.ok && news.value) {
            await updateMediaPostFields(supabase, news.value.id, {
                published_at: publishedAt ?? new Date().toISOString(),
            })
        }

        return Ok(updated.value)
    } catch (error) {
        return Err(serializeError(error))
    }
}
