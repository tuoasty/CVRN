import type {PlayerLeaderboardRow} from "@/server/domains/player";
import {perSetOf, sumByPlayer, type PlayerTotals} from "./perSet";

export const LEADER_STATS = [
    {key: "points", label: "Points"},
    {key: "assists", label: "Assists"},
    {key: "blocks", label: "Blocks"},
    {key: "receives", label: "Receives"},
] as const;

export const LEADER_MIN_SETS = 6;

export interface Leader {
    key: (typeof LEADER_STATS)[number]["key"];
    label: string;
    playerId: string;
    value: number;
}

export function buildLeaders(input: {
    rosterIds: string[];
    seasonRows: PlayerLeaderboardRow[];
    careerRows: PlayerLeaderboardRow[];
}): {source: "season" | "alltime"; leaders: Leader[]} {
    const ids = new Set(input.rosterIds);
    const season = sumByPlayer(input.seasonRows.filter((r) => ids.has(r.player_id)));
    const hasSeason = [...season.values()].some((e) => e.sets > 0);
    const source = hasSeason ? "season" : "alltime";
    const totals = hasSeason ? season : sumByPlayer(input.careerRows.filter((r) => ids.has(r.player_id)));

    const played = [...totals.entries()].filter(([, e]) => e.sets > 0);
    const qualified = played.filter(([, e]) => e.sets >= LEADER_MIN_SETS);
    const pool: [string, PlayerTotals][] = qualified.length > 0 ? qualified : played;

    const leaders: Leader[] = [];
    for (const {key, label} of LEADER_STATS) {
        let best: {playerId: string; value: number; sets: number} | null = null;
        for (const [playerId, entry] of pool) {
            const value = perSetOf(entry, key);
            if (value === null) continue;
            if (
                !best ||
                value > best.value ||
                (value === best.value && (entry.sets > best.sets || (entry.sets === best.sets && playerId < best.playerId)))
            ) {
                best = {playerId, value, sets: entry.sets};
            }
        }
        if (best && Math.round(best.value * 10) > 0) leaders.push({key, label, playerId: best.playerId, value: best.value});
    }

    return {source, leaders};
}
