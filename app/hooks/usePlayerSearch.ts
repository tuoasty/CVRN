import useSWR from "swr"
import { searchPlayersForPublicAction } from "@/app/actions/player.actions"
import type { PlayerSearchHit } from "@/server/domains/player"

const playerSearchKey = (query: string) => `players/search/${query}`

async function fetchPlayerSearch(
    [, query]: [string, string]
): Promise<PlayerSearchHit[]> {
    const result = await searchPlayersForPublicAction({ query })
    if (!result.ok) throw new Error(result.error.message)
    return result.value
}

export function usePlayerSearch(query: string) {
    const trimmed = query.trim()
    const key: [string, string] | null = trimmed
        ? [playerSearchKey(trimmed), trimmed]
        : null
    const { data, error, isLoading, mutate } = useSWR(key, fetchPlayerSearch, { keepPreviousData: true })
    return {
        players:   data ?? [],
        isLoading: isLoading && !!key,
        error,
        retry:     () => mutate(),
    }
}
