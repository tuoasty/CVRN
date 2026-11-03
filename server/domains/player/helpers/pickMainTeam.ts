import type {PlayerSeasonStat, PlayerTeamHistoryEntry} from "../types";

export function pickMainTeam(
    history: PlayerTeamHistoryEntry[],
    stats: Pick<PlayerSeasonStat, "season_id" | "region_code" | "sets_played">[],
    now: Date = new Date(),
): PlayerTeamHistoryEntry | null {
    const active = history.filter(e =>
        e.left_at === null && (e.season_end_date === null || new Date(e.season_end_date) >= now),
    );
    if (active.length < 2) return null;

    const mainLeague = active.filter(e => e.league_type === "main");
    const candidates = mainLeague.length > 0 ? mainLeague : active;
    if (candidates.length === 1) return candidates[0];

    const sideSeasons = new Set(history.filter(e => e.league_type === "side").map(e => e.season_id));
    const setsByRegion = new Map<string, number>();
    for (const stat of stats) {
        if (sideSeasons.has(stat.season_id)) continue;
        const region = stat.region_code.toUpperCase();
        setsByRegion.set(region, (setsByRegion.get(region) ?? 0) + (stat.sets_played ?? 0));
    }

    let best = candidates[0];
    let bestSets = setsByRegion.get(best.region_code.toUpperCase()) ?? 0;
    for (const candidate of candidates.slice(1)) {
        const sets = setsByRegion.get(candidate.region_code.toUpperCase()) ?? 0;
        if (sets > bestSets) {
            best = candidate;
            bestSets = sets;
        }
    }
    return best;
}
