import { CategoryWeights, OVERALL_CATEGORIES, WEIGHT_TOTAL } from '../types'

export function weightTotal(weights: CategoryWeights): number {
    return OVERALL_CATEGORIES.reduce((sum, c) => sum + weights[c], 0)
}

export function normalizeWeights(weights: CategoryWeights): CategoryWeights {
    const total = weightTotal(weights)
    const isWhole = OVERALL_CATEGORIES.every(c => Number.isInteger(weights[c]))
    if (total === WEIGHT_TOTAL && isWhole) return weights

    const raw = OVERALL_CATEGORIES.map(c => (total > 0 ? (weights[c] / total) * WEIGHT_TOTAL : WEIGHT_TOTAL / OVERALL_CATEGORIES.length))
    const floored = raw.map(Math.floor)
    let remainder = WEIGHT_TOTAL - floored.reduce((sum, n) => sum + n, 0)

    const order = raw
        .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
        .sort((a, b) => b.fraction - a.fraction || a.index - b.index)
    for (const { index } of order) {
        if (remainder <= 0) break
        floored[index] += 1
        remainder -= 1
    }

    const result = {} as CategoryWeights
    OVERALL_CATEGORIES.forEach((c, i) => { result[c] = floored[i] })
    return result
}
