import { OverallScalingRow, PlayerOverallRow, SeasonOverallInputRow } from '@/shared/types/db'
import { OVERALL_POSITIONS, OverallConfig, OverallInputRow, OverallPosition, OverallScaling } from '../types'
import { defaultScalingSet } from './defaultScalings'

function toPosition(value: string | null): OverallPosition | null {
    return (OVERALL_POSITIONS as readonly string[]).includes(value ?? '') ? value as OverallPosition : null
}

function toNumberOrNull(value: number | string | null): number | null {
    if (value === null || value === undefined) return null
    const n = Number(value)
    return Number.isFinite(n) ? n : null
}

export function toOverallInputRow(row: SeasonOverallInputRow): OverallInputRow {
    return {
        playerId: row.player_id,
        robloxUserId: row.roblox_user_id,
        username: row.username,
        displayName: row.display_name ?? null,
        avatarUrl: row.avatar_url ?? null,
        teamId: row.team_id ?? null,
        teamName: row.team_name ?? null,
        teamLogoUrl: row.team_logo_url ?? null,
        position: toPosition(row.position ?? null),
        setsPlayed: Number(row.sets_played ?? 0),
        ranks: {
            scoring: toNumberOrNull(row.scoring_rank),
            spiking: toNumberOrNull(row.spiking_rank),
            setting: toNumberOrNull(row.setting_rank),
            blocking: toNumberOrNull(row.blocking_rank),
            receiving: toNumberOrNull(row.receiving_rank),
            serving: toNumberOrNull(row.serving_rank),
        },
    }
}

function toOverallScaling(row: OverallScalingRow, position: OverallPosition): OverallScaling {
    return {
        position,
        weights: {
            scoring: Number(row.w_scoring),
            spiking: Number(row.w_spiking),
            setting: Number(row.w_setting),
            blocking: Number(row.w_blocking),
            receiving: Number(row.w_receiving),
            serving: Number(row.w_serving),
        },
        floor: Number(row.floor),
        ceil: Number(row.ceil),
        curve: Number(row.curve),
    }
}

export function toOverallConfig(scalingRows: OverallScalingRow[], overrideRows: PlayerOverallRow[]): OverallConfig {
    const scalings = defaultScalingSet()
    const savedPositions: OverallPosition[] = []
    for (const row of scalingRows) {
        const position = toPosition(row.position)
        if (!position) continue
        scalings[position] = toOverallScaling(row, position)
        savedPositions.push(position)
    }
    const overrides: Record<string, number> = {}
    for (const row of overrideRows) overrides[row.player_id] = row.overall
    return { scalings, savedPositions, overrides }
}
