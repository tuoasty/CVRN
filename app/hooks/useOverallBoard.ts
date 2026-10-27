import useSWR, { mutate as globalMutate } from 'swr'
import {
    clearOverallOverrideAction,
    copyOverallScalingsAction,
    getOverallBoardAction,
    saveOverallScalingsAction,
    setOverallOverrideAction,
} from '@/app/actions/overall.actions'
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

async function withOptimisticOverride(
    seasonId: string,
    playerId: string,
    overall: number | null,
    run: () => Promise<Result<OverallConfig>>,
): Promise<Result<OverallConfig>> {
    const key = overallBoardKey(seasonId)
    let previous: OverallBoard | undefined
    await globalMutate(
        key,
        (board: OverallBoard | undefined) => {
            previous = board
            if (!board) return board
            const overrides = { ...board.config.overrides }
            if (overall === null) delete overrides[playerId]
            else overrides[playerId] = overall
            return { ...board, config: { ...board.config, overrides } }
        },
        { revalidate: false },
    )
    const result = await run()
    if (!result.ok) {
        await globalMutate(key, previous, { revalidate: false })
        return result
    }
    return applyConfig(seasonId, result)
}

export async function setOverallOverride(seasonId: string, playerId: string, overall: number) {
    return withOptimisticOverride(seasonId, playerId, overall, () => setOverallOverrideAction({ seasonId, playerId, overall }))
}

export async function clearOverallOverride(seasonId: string, playerId: string) {
    return withOptimisticOverride(seasonId, playerId, null, () => clearOverallOverrideAction({ seasonId, playerId }))
}
