import { Err, Ok, Result } from '@/shared/types/result'
import { DBClient } from '@/shared/types/db'
import { serializeError } from '@/server/utils/serializeableError'
import { findPlayersByIds } from '@/server/db/players.repo'
import { findArticleBySlug } from '@/server/db/article.repo'
import { findAllMediaPosts } from '@/server/db/mediaPost.repo'
import { findArticleMediaByArticleId } from '@/server/db/articleMedia.repo'
import { ArticleDetail, ArticleAuthor, ArticleImageRef } from '../types'

export async function getArticleBySlug(supabase: DBClient, slug: string): Promise<Result<ArticleDetail | null>> {
    try {
        const lookup = await findArticleBySlug(supabase, slug)
        if (!lookup.ok) return lookup
        const article = lookup.value
        if (!article) return Ok(null)

        let author: ArticleAuthor | null = null
        if (article.author_id) {
            const players = await findPlayersByIds(supabase, [article.author_id])
            if (players.ok && players.value[0]) {
                const pl = players.value[0]
                author = { id: pl.id, username: pl.username, display_name: pl.display_name, avatar_url: pl.avatar_url }
            }
        }

        const mediaRes = await findArticleMediaByArticleId(supabase, article.id)
        const images: ArticleImageRef[] = mediaRes.ok
            ? mediaRes.value.map(m => ({ handle: m.handle, placement: m.placement, url: m.image_url, mediaPostId: m.media_post_id }))
            : []
        const coverUrl = images.find(i => i.handle === 'cover')?.url ?? images[0]?.url ?? null

        let matchGfxUrl: string | null = null
        let matchVodUrl: string | null = null
        if (article.match_id) {
            const matchMedia = await findAllMediaPosts(supabase, { matchId: article.match_id })
            if (matchMedia.ok) {
                matchGfxUrl = matchMedia.value.find(m => m.type === 'gfx')?.image_url ?? null
                matchVodUrl = matchMedia.value.find(m => m.type === 'video')?.video_url ?? null
            }
        }

        const detail: ArticleDetail = {
            id:            article.id,
            slug:          article.slug,
            title:         article.title,
            body:          article.body,
            author,
            match_id:      article.match_id,
            season_id:     article.season_id,
            cover_url:     coverUrl,
            images,
            match_gfx_url: matchGfxUrl,
            match_vod_url: matchVodUrl,
            published_at:  article.published_at,
            created_at:    article.created_at,
            updated_at:    article.updated_at,
        }
        return Ok(detail)
    } catch (error) {
        return Err(serializeError(error))
    }
}
