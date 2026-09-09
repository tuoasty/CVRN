import { DBClient, Article } from '@/shared/types/db'
import { Ok, Result } from '@/shared/types/result'
import { findPlayersByIds } from '@/server/db/players.repo'
import { findGfxByMatchIds } from '@/server/db/mediaPost.repo'
import { findArticleCoversByArticleIds } from '@/server/db/articleMedia.repo'
import { ArticleListItem, ArticleAuthor } from '../types'
import { buildSnippet } from './snippet'

export async function toListItems(supabase: DBClient, articles: Article[]): Promise<Result<ArticleListItem[]>> {
    if (articles.length === 0) return Ok([])

    const authorIds = [...new Set(articles.map(a => a.author_id).filter((v): v is string => !!v))]
    const articleIds = articles.map(a => a.id)

    const [authorsRes, coversRes] = await Promise.all([
        authorIds.length ? findPlayersByIds(supabase, authorIds) : Promise.resolve(Ok([])),
        findArticleCoversByArticleIds(supabase, articleIds),
    ])
    if (!authorsRes.ok) return authorsRes
    if (!coversRes.ok) return coversRes

    const authorMap = new Map<string, ArticleAuthor>()
    for (const pl of authorsRes.value) {
        authorMap.set(pl.id, { id: pl.id, username: pl.username, display_name: pl.display_name, avatar_url: pl.avatar_url })
    }

    const coverImageByArticle = coversRes.value

    const matchFallbackIds = [...new Set(
        articles
            .filter(a => a.match_id && !coverImageByArticle.has(a.id))
            .map(a => a.match_id as string)
    )]
    const gfxRes = await findGfxByMatchIds(supabase, matchFallbackIds)
    if (!gfxRes.ok) return gfxRes
    const gfxByMatch = new Map<string, string>()
    for (const post of gfxRes.value) {
        if (post.match_id && post.image_url && !gfxByMatch.has(post.match_id)) gfxByMatch.set(post.match_id, post.image_url)
    }

    const items: ArticleListItem[] = articles.map(a => ({
        id:            a.id,
        slug:          a.slug,
        title:         a.title,
        snippet:       buildSnippet(a.body),
        thumbnail_url: coverImageByArticle.get(a.id) ?? (a.match_id ? gfxByMatch.get(a.match_id) ?? null : null),
        author:        a.author_id ? authorMap.get(a.author_id) ?? null : null,
        match_id:      a.match_id,
        published_at:  a.published_at,
        created_at:    a.created_at,
    }))

    return Ok(items)
}
