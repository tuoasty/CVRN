import { DBClient } from '@/shared/types/db'
import { Err, Ok, Result } from '@/shared/types/result'
import { serializeError } from '@/server/utils/serializeableError'

export interface ArticleMediaJoined {
    id: string
    handle: string
    placement: 'left' | 'center' | 'right'
    sort_order: number
    media_post_id: string
    image_url: string | null
    post_type: string
    owner_article_id: string | null
}

interface RawJoinRow {
    id: string
    handle: string
    placement: 'left' | 'center' | 'right'
    sort_order: number
    media_post_id: string
    media_posts: { id: string; image_url: string | null; type: string; article_id: string | null } | null
}

function mapJoinRow(r: RawJoinRow): ArticleMediaJoined {
    return {
        id:               r.id,
        handle:           r.handle,
        placement:        r.placement,
        sort_order:       r.sort_order,
        media_post_id:    r.media_post_id,
        image_url:        r.media_posts?.image_url ?? null,
        post_type:        r.media_posts?.type ?? '',
        owner_article_id: r.media_posts?.article_id ?? null,
    }
}

const JOIN_SELECT = 'id, handle, placement, sort_order, media_post_id, media_posts(id, image_url, type, article_id)'

export async function insertArticleMedia(
    supabase: DBClient,
    p: { articleId: string; mediaPostId: string; handle: string; placement: string; sortOrder: number },
): Promise<Result<null>> {
    const { error } = await supabase
        .from('article_media')
        .insert({
            article_id:    p.articleId,
            media_post_id: p.mediaPostId,
            handle:        p.handle,
            placement:     p.placement,
            sort_order:    p.sortOrder,
        })
    if (error) return Err(serializeError(error, 'DB_ERROR'))
    return Ok(null)
}

export async function findArticleMediaByArticleId(
    supabase: DBClient,
    articleId: string,
): Promise<Result<ArticleMediaJoined[]>> {
    const { data, error } = await supabase
        .from('article_media')
        .select(JOIN_SELECT)
        .eq('article_id', articleId)
        .order('sort_order', { ascending: true })
    if (error) return Err(serializeError(error, 'DB_ERROR'))
    return Ok(((data ?? []) as unknown as RawJoinRow[]).map(mapJoinRow))
}

export async function findArticleCoversByArticleIds(
    supabase: DBClient,
    articleIds: string[],
): Promise<Result<Map<string, string>>> {
    if (articleIds.length === 0) return Ok(new Map())
    const { data, error } = await supabase
        .from('article_media')
        .select('article_id, media_posts(image_url)')
        .eq('handle', 'cover')
        .in('article_id', articleIds)
    if (error) return Err(serializeError(error, 'DB_ERROR'))
    const map = new Map<string, string>()
    for (const row of (data ?? []) as unknown as { article_id: string; media_posts: { image_url: string | null } | null }[]) {
        const url = row.media_posts?.image_url
        if (url && !map.has(row.article_id)) map.set(row.article_id, url)
    }
    return Ok(map)
}

export async function updateArticleMedia(
    supabase: DBClient,
    id: string,
    fields: { placement?: string; sort_order?: number },
): Promise<Result<null>> {
    const { error } = await supabase
        .from('article_media')
        .update(fields)
        .eq('id', id)
    if (error) return Err(serializeError(error, 'DB_ERROR'))
    return Ok(null)
}

export async function deleteArticleMediaById(supabase: DBClient, id: string): Promise<Result<null>> {
    const { error } = await supabase.from('article_media').delete().eq('id', id)
    if (error) return Err(serializeError(error, 'DB_ERROR'))
    return Ok(null)
}
