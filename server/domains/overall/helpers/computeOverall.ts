import { CategoryRanks, CategoryRatings, ComputedOverall, OVERALL_CATEGORIES, OverallScaling } from '../types'

type Scale = Pick<OverallScaling, 'floor' | 'ceil' | 'curve'>

export const FULL_CREDIT_SETS = 6
export const REPLACEMENT_PCT = 0.35

function toRating(pct: number, { floor, ceil, curve }: Scale): number {
    const clamped = Math.min(1, Math.max(0, pct))
    return Math.round(floor + (ceil - floor) * Math.pow(clamped, curve))
}

function discountSmallSample(pct: number, setsPlayed: number): number {
    if (pct <= REPLACEMENT_PCT) return pct
    const credit = Math.min(1, Math.max(0, setsPlayed) / FULL_CREDIT_SETS)
    return REPLACEMENT_PCT + credit * (pct - REPLACEMENT_PCT)
}

export function computeOverall(
    ranks: CategoryRanks,
    scaling: Omit<OverallScaling, 'position'>,
    setsPlayed: number,
): ComputedOverall {
    const attributes = {} as CategoryRatings
    let weighted = 0
    let totalWeight = 0

    for (const category of OVERALL_CATEGORIES) {
        const pct = ranks[category] ?? 0
        const weight = scaling.weights[category]
        attributes[category] = toRating(discountSmallSample(pct, setsPlayed), scaling)
        weighted += weight * pct
        totalWeight += weight
    }

    const blended = totalWeight > 0 ? weighted / totalWeight : 0
    return { ovr: toRating(discountSmallSample(blended, setsPlayed), scaling), attributes }
}
