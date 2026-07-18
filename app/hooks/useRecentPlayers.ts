import useSWR from "swr"
import { getRecentPlayersForPublicAction } from "@/app/actions/player.actions"
import type { PlayerSearchHit } from "@/server/domains/player"

async function fetchRecentPlayers(): Promise<PlayerSearchHit[]> {
    const result = await getRecentPlayersForPublicAction()
    if (!result.ok) throw new Error(result.error.message)
    return result.value
}

/**
 * Default (empty-query) player list for the public players page: the most-recently-rostered
 * players. Cached under a static key so it loads once and is shared across mounts.
 */
export function useRecentPlayers() {
    const { data, error, isLoading } = useSWR("players/recent", fetchRecentPlayers)
    return {
        players:   data ?? [],
        isLoading,
        error,
    }
}
