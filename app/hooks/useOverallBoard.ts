import useSWR from 'swr'
import { getOverallBoardAction } from '@/app/actions/overall.actions'
import type { OverallBoard } from '@/server/domains/overall'

const OVERALL_BOARD_TTL = 60 * 1000

export const overallBoardKey = (seasonId: string) => ['overall-board', seasonId] as const

async function fetchBoard([, seasonId]: readonly [string, string]): Promise<OverallBoard> {
    const result = await getOverallBoardAction(seasonId)
    if (!result.ok) throw new Error(result.error.message)
    return result.value
}

export function useOverallBoard(seasonId: string | null) {
    const { data, error, isLoading, mutate } = useSWR(
        seasonId ? overallBoardKey(seasonId) : null,
        fetchBoard,
        { dedupingInterval: OVERALL_BOARD_TTL, revalidateOnFocus: false },
    )
    return { board: data ?? null, isLoading, error: error?.message ?? null, mutate }
}
