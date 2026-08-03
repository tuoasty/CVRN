import useSWR, { mutate as globalMutate } from 'swr'
import {
    assignMediaToMatchAction,
    getAllMediaPostsAction,
    getPagedMediaPostsAction,
    getRecentMediaPostsAction,
} from '@/app/actions/media.actions'
import { MediaFilterType, MediaPost, PagedMediaResult } from '@/server/domains/media'
import { Result } from '@/shared/types/result'

const ALL_MEDIA_KEY = 'media/all'
const RECENT_MEDIA_KEY = (limit: number) => `media/recent/${limit}`

async function fetchAllMedia(): Promise<MediaPost[]> {
    const result = await getAllMediaPostsAction()
    if (!result.ok) throw new Error(result.error.message)
    return result.value
}

async function fetchRecentMedia([, limit]: [string, number]): Promise<MediaPost[]> {
    const result = await getRecentMediaPostsAction(limit)
    if (!result.ok) throw new Error(result.error.message)
    return result.value
}

export function useAllMediaPosts() {
    const { data, error, isLoading } = useSWR(ALL_MEDIA_KEY, fetchAllMedia)
    return { posts: data ?? [], error, isLoading }
}

export function useRecentMediaPosts(limit = 4) {
    const { data, error, isLoading } = useSWR([RECENT_MEDIA_KEY(limit), limit], fetchRecentMedia)
    return { posts: data ?? [], error, isLoading }
}

export function mutateAllMedia() {
    return globalMutate(ALL_MEDIA_KEY)
}

export async function assignMediaToMatch(postId: string, matchId: string | null): Promise<Result<MediaPost>> {
    const result = await assignMediaToMatchAction({ postId, matchId })
    if (result.ok) await mutateAllMedia()
    return result
}

const pagedMediaKey = (filter: MediaFilterType, page: number, search: string, pageSize: number) =>
    `media/paged/${filter}/${page}/${search}/${pageSize}`

async function fetchPagedMedia(
    [, filter, page, search, pageSize]: [string, MediaFilterType, number, string, number]
): Promise<PagedMediaResult> {
    const result = await getPagedMediaPostsAction({ filter, page, pageSize, search: search || undefined })
    if (!result.ok) throw new Error(result.error.message)
    return result.value
}

export function usePagedMediaPosts(filter: MediaFilterType, page: number, search: string, disabled = false, pageSize = 12) {
    const key: [string, MediaFilterType, number, string, number] | null = disabled
        ? null
        : [pagedMediaKey(filter, page, search, pageSize), filter, page, search, pageSize]
    const { data, error, isLoading } = useSWR(key, fetchPagedMedia, { keepPreviousData: true })
    return {
        posts:      data?.posts ?? [],
        total:      data?.total ?? 0,
        totalPages: data?.totalPages ?? 0,
        isLoading,
        error,
    }
}
