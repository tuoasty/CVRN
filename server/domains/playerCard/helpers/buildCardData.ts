import { computeOverall } from '@/server/domains/overall/helpers/computeOverall'
import { NEUTRAL_SCALING } from '@/server/domains/overall/helpers/defaultScalings'
import { OVERALL_CATEGORIES } from '@/server/domains/overall/types'
import type { OverallConfig, OverallInputRow } from '@/server/domains/overall/types'
import type { CardData, CardOverrides } from '../types'

export function seasonLabel(regionCode: string | null, seasonNumber: number): string {
    return regionCode ? `${regionCode} S${seasonNumber}` : `S${seasonNumber}`
}

export function buildCardData(player: OverallInputRow, config: OverallConfig, seasonNumber: number, overrides: CardOverrides = {}): CardData {
    const scaling = player.position ? config.scalings[player.position] : NEUTRAL_SCALING
    const computed = computeOverall(player.ranks, scaling, player.setsPlayed)

    const attributes = { ...computed.attributes }
    for (const category of OVERALL_CATEGORIES) {
        const value = overrides.attributes?.[category]
        if (value !== undefined) attributes[category] = value
    }

    return {
        username: overrides.username ?? player.username,
        displayName: overrides.username ?? player.displayName,
        ovr: overrides.ovr ?? config.overrides[player.playerId] ?? computed.ovr,
        position: overrides.position ?? player.position,
        teamName: player.teamName,
        season: seasonLabel(player.regionCode, seasonNumber),
        attributes,
    }
}
