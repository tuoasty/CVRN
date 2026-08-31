import useSWR, { mutate as globalMutate } from 'swr'
import {
    getPublishedArticlesAction,
    getArticlesForAdminAction,
} from '@/app/actions/article.actions'
import type { ArticleListItem } from '@/server/domains/article'

const ARTICLES_TTL = 2 * 60 * 1000

const PUBLISHED_KEY = 'articles/published'
const ADMIN_KEY = 'articles/admin'

async function fetchPublished(): Promise<ArticleListItem[]> {
    const result = await getPublishedArticlesAction()
    if (!result.ok) throw new Error(result.error.message)
    return result.value
}

async function fetchAdmin(): Promise<ArticleListItem[]> {
    const result = await getArticlesForAdminAction()
    if (!result.ok) throw new Error(result.error.message)
    return result.value
}

export function usePublishedArticles() {
    const { data, error, isLoading, mutate } = useSWR(PUBLISHED_KEY, fetchPublished, {
        dedupingInterval: ARTICLES_TTL,
        revalidateOnFocus: false,
    })
    return { articles: data ?? [], isLoading, error: error?.message ?? null, mutate }
}

export function useAdminArticles() {
    const { data, error, isLoading, mutate } = useSWR(ADMIN_KEY, fetchAdmin, {
        dedupingInterval: ARTICLES_TTL,
        revalidateOnFocus: false,
    })
    return { articles: data ?? [], isLoading, error: error?.message ?? null, mutate }
}

export async function mutateArticles() {
    await Promise.all([globalMutate(PUBLISHED_KEY), globalMutate(ADMIN_KEY)])
}
