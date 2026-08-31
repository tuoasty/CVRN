import { Err, Result } from '@/shared/types/result'
import { DBClient } from '@/shared/types/db'
import { serializeError } from '@/server/utils/serializeableError'
import { findPublishedArticles } from '@/server/db/article.repo'
import { ArticleListItem } from '../types'
import { toListItems } from '../helpers/toListItems'

export async function getPublishedArticles(supabase: DBClient, seasonId?: string): Promise<Result<ArticleListItem[]>> {
    try {
        const result = await findPublishedArticles(supabase, seasonId)
        if (!result.ok) return result
        return toListItems(supabase, result.value)
    } catch (error) {
        return Err(serializeError(error))
    }
}
