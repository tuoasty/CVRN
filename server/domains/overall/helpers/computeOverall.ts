import { CategoryRanks, CategoryRatings, ComputedOverall, OVERALL_CATEGORIES, OverallScaling } from '../types'

type Scale = Pick<OverallScaling, 'floor' | 'ceil' | 'curve'>

function toRating(pct: number, { floor, ceil, curve }: Scale): number {
    const clamped = Math.min(1, Math.max(0, pct))
    return Math.round(floor + (ceil - floor) * Math.pow(clamped, curve))
}

export function computeOverall(ranks: CategoryRanks, scaling: Omit<OverallScaling, 'position'>): ComputedOverall {
    const attributes = {} as CategoryRatings
    let weighted = 0
    let totalWeight = 0

    for (const category of OVERALL_CATEGORIES) {
        const pct = ranks[category] ?? 0
        const weight = scaling.weights[category]
        attributes[category] = toRating(pct, scaling)
        weighted += weight * pct
        totalWeight += weight
    }

    const blended = totalWeight > 0 ? weighted / totalWeight : 0
    return { ovr: toRating(blended, scaling), attributes }
}
