import type { HeightEntry } from '../../types/datasets'
import type { HeightOdds } from '../../types/buildIndex'
import { formatHeight, gameHeightToInches } from '@/shared/utils/height'

export function buildHeightOdds(heights: HeightEntry[]): HeightOdds[] {
    const total = heights.reduce((sum, h) => sum + h.weight, 0)
    return heights.map(h => {
        const inches = gameHeightToInches(h.value)
        return { value: h.value, inches, label: formatHeight(inches), weight: h.weight, pct: total > 0 ? (h.weight / total) * 100 : 0 }
    })
}
