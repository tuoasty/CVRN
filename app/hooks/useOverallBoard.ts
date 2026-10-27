import useSWR, { mutate as globalMutate } from 'swr'
import { copyOverallScalingsAction, getOverallBoardAction, saveOverallScalingsAction } from '@/app/actions/overall.actions'
import type { OverallBoard, OverallConfig, OverallScaling } from '@/server/domains/overall'
import type { Result } from '@/shared/types/result'

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

async function applyConfig(seasonId: string, result: Result<OverallConfig>): Promise<Result<OverallConfig>> {
    if (result.ok) {
        await globalMutate(
            overallBoardKey(seasonId),
            (board: OverallBoard | undefined) => (board ? { ...board, config: result.value } : board),
            { revalidate: false },
        )
    }
    return result
}

export async function saveOverallScalings(seasonId: string, scalings: OverallScaling[]) {
    return applyConfig(seasonId, await saveOverallScalingsAction({ seasonId, scalings }))
}

export async function copyOverallScalings(seasonId: string, fromSeasonId: string) {
    return applyConfig(seasonId, await copyOverallScalingsAction({ seasonId, fromSeasonId }))
}
