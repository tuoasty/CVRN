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

/**
 * Global (all-regions, all-seasons) player search. Pass an already-debounced query.
 * An empty/whitespace query disables the request (null key) so no fetch fires on an empty box.
 */
export function usePlayerSearch(query: string) {
    const trimmed = query.trim()
    const key: [string, string] | null = trimmed
        ? [playerSearchKey(trimmed), trimmed]
        : null
    const { data, error, isLoading } = useSWR(key, fetchPlayerSearch, { keepPreviousData: true })
    return {
        players:   data ?? [],
        isLoading: isLoading && !!key,
        error,
    }
}
