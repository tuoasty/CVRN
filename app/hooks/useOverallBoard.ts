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

export const overallBoardKey = (seasonNumber: number) => ['overall-board', seasonNumber] as const

async function fetchBoard([, seasonNumber]: readonly [string, number]): Promise<OverallBoard> {
    const result = await getOverallBoardAction(seasonNumber)
    if (!result.ok) throw new Error(result.error.message)
    return result.value
}

export function useOverallBoard(seasonNumber: number | null) {
    const { data, error, isLoading, mutate } = useSWR(
        seasonNumber ? overallBoardKey(seasonNumber) : null,
        fetchBoard,
        { dedupingInterval: OVERALL_BOARD_TTL, revalidateOnFocus: false },
    )
    return { board: data ?? null, isLoading, error: error?.message ?? null, mutate }
}

async function applyConfig(seasonNumber: number, result: Result<OverallConfig>): Promise<Result<OverallConfig>> {
    if (result.ok) {
        await globalMutate(
            overallBoardKey(seasonNumber),
            (board: OverallBoard | undefined) => (board ? { ...board, config: result.value } : board),
            { revalidate: false },
        )
    }
    return result
}

export async function saveOverallScalings(seasonNumber: number, scalings: OverallScaling[]) {
    return applyConfig(seasonNumber, await saveOverallScalingsAction({ seasonNumber, scalings }))
}

export async function copyOverallScalings(seasonNumber: number, fromSeasonNumber: number) {
    return applyConfig(seasonNumber, await copyOverallScalingsAction({ seasonNumber, fromSeasonNumber }))
}

async function withOptimisticOverride(
    seasonNumber: number,
    playerId: string,
    overall: number | null,
    run: () => Promise<Result<OverallConfig>>,
): Promise<Result<OverallConfig>> {
    const key = overallBoardKey(seasonNumber)
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
    return applyConfig(seasonNumber, result)
}

export async function setOverallOverride(seasonNumber: number, playerId: string, overall: number) {
    return withOptimisticOverride(seasonNumber, playerId, overall, () => setOverallOverrideAction({ seasonNumber, playerId, overall }))
}

export async function clearOverallOverride(seasonNumber: number, playerId: string) {
    return withOptimisticOverride(seasonNumber, playerId, null, () => clearOverallOverrideAction({ seasonNumber, playerId }))
}
