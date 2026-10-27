import { computeOverall } from '@/server/domains/overall/helpers/computeOverall'
import { NEUTRAL_SCALING } from '@/server/domains/overall/helpers/defaultScalings'
import type { CategoryRatings, OverallCategory, OverallInputRow, OverallPosition, OverallScalingSet } from '@/server/domains/overall'

export type OverallSortKey = 'ovr' | 'sets' | OverallCategory

export interface OverallDisplayRow extends OverallInputRow {
    computedOvr: number
    overrideOvr: number | null
    ovr: number
    attributes: CategoryRatings
}

export const CATEGORY_COLUMNS: { key: OverallCategory; label: string; title: string }[] = [
    { key: 'scoring',   label: 'SCR', title: 'Scoring' },
    { key: 'spiking',   label: 'SPK', title: 'Spiking' },
    { key: 'setting',   label: 'SET', title: 'Setting' },
    { key: 'blocking',  label: 'BLK', title: 'Blocking' },
    { key: 'receiving', label: 'REC', title: 'Receiving' },
    { key: 'serving',   label: 'SRV', title: 'Serving' },
]

export function buildOverallRows(
    players: OverallInputRow[],
    scalings: OverallScalingSet,
    overrides: Record<string, number>,
): OverallDisplayRow[] {
    return players.map(player => {
        const scaling = player.position ? scalings[player.position] : NEUTRAL_SCALING
        const { ovr, attributes } = computeOverall(player.ranks, scaling, player.setsPlayed)
        const overrideOvr = overrides[player.playerId] ?? null
        return { ...player, computedOvr: ovr, overrideOvr, ovr: overrideOvr ?? ovr, attributes }
    })
}

function sortValue(row: OverallDisplayRow, key: OverallSortKey): number {
    if (key === 'ovr') return row.ovr
    if (key === 'sets') return row.setsPlayed
    return row.attributes[key]
}

export function sortOverallRows(rows: OverallDisplayRow[], key: OverallSortKey, desc: boolean): OverallDisplayRow[] {
    const dir = desc ? -1 : 1
    return [...rows].sort((a, b) =>
        dir * (sortValue(a, key) - sortValue(b, key)) ||
        b.ovr - a.ovr ||
        b.setsPlayed - a.setsPlayed ||
        a.username.localeCompare(b.username)
    )
}

export function rankOverallRows(rows: OverallDisplayRow[], key: OverallSortKey): { row: OverallDisplayRow; rank: number }[] {
    let previous: number | null = null
    let previousRank = 0
    return rows.map((row, i) => {
        const value = sortValue(row, key)
        const rank = previous !== null && value === previous ? previousRank : i + 1
        previous = value
        previousRank = rank
        return { row, rank }
    })
}

export function matchesOverallFilters(row: OverallDisplayRow, position: OverallPosition | 'ALL', q: string): boolean {
    if (position !== 'ALL' && row.position !== position) return false
    const needle = q.trim().toLowerCase()
    if (!needle) return true
    return row.username.toLowerCase().includes(needle) || (row.displayName?.toLowerCase().includes(needle) ?? false)
}
