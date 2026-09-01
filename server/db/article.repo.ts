import { DBClient, Article } from '@/shared/types/db'
import { Err, Ok, Result } from '@/shared/types/result'
import { serializeError } from '@/server/utils/serializeableError'
import { InsertArticleDto, UpdateArticleFields } from '@/server/domains/article/types'

export async function insertArticle(supabase: DBClient, p: InsertArticleDto): Promise<Result<Article>> {
    const { data, error } = await supabase
        .from('articles')
        .insert(p)
        .select()
        .single()
    if (error) return Err(serializeError(error, 'DB_ERROR'))
    return Ok(data as unknown as Article)
}

export async function findPublishedArticles(supabase: DBClient, seasonId?: string): Promise<Result<Article[]>> {
    let query = supabase
        .from('articles')
        .select('*')
        .not('published_at', 'is', null)
        .order('published_at', { ascending: false })

    if (seasonId) query = query.eq('season_id', seasonId)

    const { data, error } = await query
    if (error) return Err(serializeError(error, 'DB_ERROR'))
    return Ok((data ?? []) as unknown as Article[])
}

export async function findAllArticles(supabase: DBClient): Promise<Result<Article[]>> {
    const { data, error } = await supabase
        .from('articles')
        .select('*')
        .order('created_at', { ascending: false })
    if (error) return Err(serializeError(error, 'DB_ERROR'))
    return Ok((data ?? []) as unknown as Article[])
}

export async function findArticleBySlug(supabase: DBClient, slug: string): Promise<Result<Article | null>> {
    const { data, error } = await supabase
        .from('articles')
        .select('*')
        .eq('slug', slug)
        .maybeSingle()
    if (error) return Err(serializeError(error, 'DB_ERROR'))
    return Ok(data as unknown as Article | null)
}

export async function findArticleById(supabase: DBClient, id: string): Promise<Result<Article | null>> {
    const { data, error } = await supabase
        .from('articles')
        .select('*')
        .eq('id', id)
        .maybeSingle()
    if (error) return Err(serializeError(error, 'DB_ERROR'))
    return Ok(data as unknown as Article | null)
}

export async function updateArticle(supabase: DBClient, id: string, fields: UpdateArticleFields): Promise<Result<Article>> {
    const { data, error } = await supabase
        .from('articles')
        .update({ ...fields, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
    if (error) return Err(serializeError(error, 'DB_ERROR'))
    return Ok(data as unknown as Article)
}

export async function deleteArticleById(supabase: DBClient, id: string): Promise<Result<null>> {
    const { error } = await supabase.from('articles').delete().eq('id', id)
    if (error) return Err(serializeError(error, 'DB_ERROR'))
    return Ok(null)
}

export async function findArticleSlugExists(supabase: DBClient, slug: string): Promise<Result<boolean>> {
    const { count, error } = await supabase
        .from('articles')
        .select('id', { count: 'exact', head: true })
        .eq('slug', slug)
    if (error) return Err(serializeError(error, 'DB_ERROR'))
    return Ok((count ?? 0) > 0)
}
