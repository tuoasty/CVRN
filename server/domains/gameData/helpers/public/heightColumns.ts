import type { HeightEntry } from '../../types/datasets'
import type { HeightColumn } from '../../types/publicInformation'
import { buildHeightOdds } from '../builds/buildHeightOdds'
import { fmt } from '../../terms/format'

const FEET = [5, 6, 7] as const

export function buildHeightColumns(heights: HeightEntry[]): HeightColumn[] {
    const odds = buildHeightOdds(heights).sort((a, b) => a.inches - b.inches)
    const max = Math.max(0, ...odds.map(o => o.weight))
    const rows = odds.map(o => ({ ...o, fill: max > 0 ? o.weight / max : 0, game: fmt(o.value) }))
    return FEET
        .map(foot => ({ foot, rows: rows.filter(r => Math.floor(r.inches / 12) === foot) }))
        .filter(column => column.rows.length > 0)
}
