import useSWR, { mutate as globalMutate } from 'swr'
import { getAllMediaPostsAction, getRecentMediaPostsAction } from '@/app/actions/media.actions'
import { MediaPost } from '@/server/domains/media'

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

export function useTeamMediaPosts(teamId: string | null) {
    const key = teamId ? `media/team/${teamId}` : null
    const { data, error, isLoading } = useSWR(
        key,
        async () => {
            const result = await getAllMediaPostsAction({ teamId: teamId! })
            if (!result.ok) throw new Error(result.error.message)
            return result.value
        }
    )
    return { posts: data ?? [], error, isLoading }
}

export function mutateAllMedia() {
    return globalMutate(ALL_MEDIA_KEY)
}
