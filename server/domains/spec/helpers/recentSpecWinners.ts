import type { Season } from '@/shared/types/db'
import type { EndedSeason, RecentSpecWinnerEntry, RecentSpecWinners } from '../types/recentWinners'

export type { RecentSpecWinners } from '../types/recentWinners'

export function latestEndedSeasons(
    seasons: Pick<Season, 'id' | 'region_id' | 'name' | 'slug' | 'end_date'>[],
    now: Date,
    count = 2,
): Map<string, EndedSeason[]> {
    const ended = seasons
        .filter((s): s is typeof s & { end_date: string } => !!s.end_date && new Date(s.end_date) < now)
        .sort((a, b) => b.end_date.localeCompare(a.end_date))

    const picked = new Map<string, EndedSeason[]>()
    for (const s of ended) {
        const list = picked.get(s.region_id) ?? []
        if (list.length >= count) continue
        list.push({ id: s.id, name: s.name, slug: s.slug, endDate: s.end_date })
        picked.set(s.region_id, list)
    }
    return picked
}

export function winnersForSpec(recent: RecentSpecWinners, specId: string): Record<string, RecentSpecWinnerEntry[]> {
    const winners = (recent.winners ?? []).filter(w => w.spec_id === specId)
    const result: Record<string, RecentSpecWinnerEntry[]> = {}
    for (const [regionId, seasons] of Object.entries(recent.seasonsByRegion ?? {})) {
        result[regionId] = seasons.map(season => {
            const won = winners.find(w => w.season_id === season.id)
            return { season, winner: won ? { starsAwarded: won.stars_awarded, player: won.player } : null }
        })
    }
    return result
}
