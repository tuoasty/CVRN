import {isSeasonActiveAt} from "@/server/domains/season/helpers/isSeasonActive";
import type {PlayerSeasonStat, PlayerTeamHistoryEntry} from "../types";

type TeamStint = Pick<
    PlayerTeamHistoryEntry,
    "season_id" | "region_code" | "league_type" | "joined_at" | "left_at" | "season_start_date" | "season_end_date"
>;

export type RegionSets = Pick<PlayerSeasonStat, "season_id" | "region_code" | "sets_played">;

export function isActiveStint(entry: Pick<TeamStint, "left_at" | "season_end_date">, now: Date = new Date()): boolean {
    return entry.left_at === null && isSeasonActiveAt({end_date: entry.season_end_date}, now);
}

function newestFirst(a: TeamStint, b: TeamStint): number {
    return b.season_start_date.localeCompare(a.season_start_date) || b.joined_at.localeCompare(a.joined_at);
}

export function pickMainTeam<T extends TeamStint>(
    history: T[],
    stats: RegionSets[],
    now: Date = new Date(),
): T | null {
    const active = history.filter(e => isActiveStint(e, now));
    if (active.length < 2) return null;

    const mainLeague = active.filter(e => e.league_type === "main");
    const candidates = (mainLeague.length > 0 ? mainLeague : active).sort(newestFirst);
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

export function pickActiveTeam<T extends TeamStint>(
    history: T[],
    stats: RegionSets[],
    now: Date = new Date(),
): T | null {
    return pickMainTeam(history, stats, now) ?? history.find(e => isActiveStint(e, now)) ?? null;
}
