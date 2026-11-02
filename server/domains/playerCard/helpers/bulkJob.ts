import type { OverallInputRow } from '@/server/domains/overall/types'
import type { CardBulkJobRow } from '@/shared/types/db'
import type { CardBulkFailure, CardBulkJob, CardBulkJobStatus, CardBulkMode, CardGroup } from '../types'
import { pickTierTemplate } from './toCardShapes'

export function toCardBulkJob(row: CardBulkJobRow): CardBulkJob {
    return {
        id: row.id,
        seasonNumber: row.season_number,
        regionCode: row.region_code,
        groupId: row.group_id,
        mode: row.mode as CardBulkMode,
        status: row.status as CardBulkJobStatus,
        stopRequested: row.stop_requested,
        stopReason: row.stop_reason,
        total: row.total,
        done: row.done,
        failed: row.failed,
        failures: Array.isArray(row.failures) ? (row.failures as unknown as CardBulkFailure[]) : [],
        currentUsername: row.current_username,
        startedAt: row.started_at,
        finishedAt: row.finished_at,
    }
}

export function selectBulkPlayers(
    rows: OverallInputRow[],
    p: { regionCode: string; mode: CardBulkMode; existingPlayerIds: string[] },
): OverallInputRow[] {
    const region = p.regionCode.toUpperCase()
    const inRegion = rows.filter(row => row.regionCode?.toUpperCase() === region)
    if (p.mode === 'all') return inRegion
    const existing = new Set(p.existingPlayerIds)
    return inRegion.filter(row => !existing.has(row.playerId))
}

export function bulkStartProblem(p: {
    group: CardGroup | undefined
    players: OverallInputRow[]
    ovrOf: (player: OverallInputRow) => number
}): string | null {
    const { group, players, ovrOf } = p
    if (!group) return 'Card group not found'
    if (!group.isActive) return `${group.name} is inactive`
    if (group.templates.length === 0) return `${group.name} has no tiers`
    if (!group.layers || group.layers.length === 0) return `${group.name} has no saved layout`
    if (players.length === 0) return 'No players to generate'

    const srcs = group.layers.flatMap(layer => (layer.kind === 'art' ? [layer.src] : []))
    const checked = new Set<string>()
    for (const player of players) {
        const tier = pickTierTemplate(group.templates, ovrOf(player))
        if (!tier || checked.has(tier.id)) continue
        checked.add(tier.id)
        const hasArt = srcs.length > 0 && srcs.every(src => tier.art.some(file => file.name === src))
        if (!hasArt) return `${tier.name} has no art yet`
    }
    return null
}
