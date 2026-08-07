import { DBClient } from '@/shared/types/db'
import { Err, Ok, Result } from '@/shared/types/result'
import { serializeError } from '@/server/utils/serializeableError'
import { InsertMediaPostDto, MediaPost } from '@/server/domains/media/types'

export async function insertMediaPost(supabase: DBClient, p: InsertMediaPostDto): Promise<Result<MediaPost>> {
    const { data, error } = await supabase
        .from('media_posts')
        .insert(p)
        .select()
        .single()
    if (error) return Err(serializeError(error, 'DB_ERROR'))
    return Ok(data as unknown as MediaPost)
}

export async function findAllMediaPosts(
    supabase: DBClient,
    filters: { type?: string; matchId?: string; teamId?: string; playerId?: string; seasonId?: string } = {}
): Promise<Result<MediaPost[]>> {
    let query = supabase
        .from('media_posts')
        .select('*')
        .order('pinned_at', { ascending: false, nullsFirst: false })
        .order('published_at', { ascending: false })

    if (filters.type)     query = query.eq('type', filters.type)
    if (filters.matchId)  query = query.eq('match_id', filters.matchId)
    if (filters.teamId)   query = query.eq('team_id', filters.teamId)
    if (filters.playerId) query = query.eq('player_id', filters.playerId)
    if (filters.seasonId) query = query.eq('season_id', filters.seasonId)

    const { data, error } = await query
    if (error) return Err(serializeError(error, 'DB_ERROR'))
    return Ok((data ?? []) as unknown as MediaPost[])
}

export async function findRecentMediaPosts(supabase: DBClient, limit: number): Promise<Result<MediaPost[]>> {
    const { data, error } = await supabase
        .from('media_posts')
        .select('*')
        .order('pinned_at', { ascending: false, nullsFirst: false })
        .order('published_at', { ascending: false })
        .limit(limit)
    if (error) return Err(serializeError(error, 'DB_ERROR'))
    return Ok((data ?? []) as unknown as MediaPost[])
}

export interface PagedMediaPostsResult {
    posts: MediaPost[]
    total: number
}

export async function findMediaPostsPaged(
    supabase: DBClient,
    types: string[],
    page: number,
    pageSize: number,
    search?: string,
): Promise<Result<PagedMediaPostsResult>> {
    const from = (page - 1) * pageSize
    const to   = from + pageSize - 1

    let query = supabase
        .from('media_posts')
        .select('*', { count: 'exact' })
        .in('type', types)
        .order('pinned_at', { ascending: false, nullsFirst: false })
        .order('published_at', { ascending: false })
        .range(from, to)

    if (search?.trim()) {

        const q = search.trim()
            .replace(/\\/g, '\\\\')
            .replace(/[%_]/g, m => `\\${m}`)
            .replace(/[,()]/g, '')
        query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`)
    }

    const { data, count, error } = await query
    if (error) return Err(serializeError(error, 'DB_ERROR'))
    return Ok({ posts: (data ?? []) as unknown as MediaPost[], total: count ?? 0 })
}

export async function countPinnedMediaPosts(supabase: DBClient): Promise<Result<number>> {
    const { count, error } = await supabase
        .from('media_posts')
        .select('*', { count: 'exact', head: true })
        .eq('is_pinned', true)
    if (error) return Err(serializeError(error, 'DB_ERROR'))
    return Ok(count ?? 0)
}

type PinBucket = 'gfx' | 'video' | 'clip'

export async function countPinnedByBucket(supabase: DBClient, bucket: PinBucket): Promise<Result<number>> {
    const { count, error } = await supabase
        .from('media_posts')
        .select('*', { count: 'exact', head: true })
        .eq('is_pinned', true)
        .eq('type', bucket)
    if (error) return Err(serializeError(error, 'DB_ERROR'))
    return Ok(count ?? 0)
}

export async function updateMediaPostPin(supabase: DBClient, id: string, is_pinned: boolean): Promise<Result<MediaPost>> {
    const now = new Date().toISOString()
    const { data, error } = await supabase
        .from('media_posts')
        .update({
            is_pinned,
            pinned_at: is_pinned ? now : null,
            updated_at: now,
        })
        .eq('id', id)
        .select()
        .single()
    if (error) return Err(serializeError(error, 'DB_ERROR'))
    return Ok(data as unknown as MediaPost)
}

export async function updateMediaPostMatch(supabase: DBClient, id: string, matchId: string | null): Promise<Result<MediaPost>> {
    const { data, error } = await supabase
        .from('media_posts')
        .update({
            match_id:   matchId,
            updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()
    if (error) return Err(serializeError(error, 'DB_ERROR'))
    return Ok(data as unknown as MediaPost)
}

export async function findMediaPostById(supabase: DBClient, id: string): Promise<Result<MediaPost | null>> {
    const { data, error } = await supabase
        .from('media_posts')
        .select('*')
        .eq('id', id)
        .maybeSingle()
    if (error) return Err(serializeError(error, 'DB_ERROR'))
    return Ok(data as unknown as MediaPost | null)
}

export async function deleteMediaPostById(supabase: DBClient, id: string): Promise<Result<null>> {
    const { error } = await supabase.from('media_posts').delete().eq('id', id)
    if (error) return Err(serializeError(error, 'DB_ERROR'))
    return Ok(null)
}
