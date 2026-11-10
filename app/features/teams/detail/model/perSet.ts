import type {PlayerLeaderboardRow} from "@/server/domains/player";

export const TOTAL_FIELDS = {
    points: "points_total",
    kills: "kills_total",
    assists: "assists_total",
    blocks: "blocks_total",
    receives: "receives_total",
    aces: "aces_total",
} as const;

export type StatKey = keyof typeof TOTAL_FIELDS;

export interface PlayerTotals {
    sets: number;
    totals: Record<StatKey, number>;
}

const KEYS = Object.keys(TOTAL_FIELDS) as StatKey[];

function emptyTotals(): Record<StatKey, number> {
    return Object.fromEntries(KEYS.map((k) => [k, 0])) as Record<StatKey, number>;
}

export function sumByPlayer(rows: PlayerLeaderboardRow[]): Map<string, PlayerTotals> {
    const out = new Map<string, PlayerTotals>();
    for (const row of rows) {
        let entry = out.get(row.player_id);
        if (!entry) {
            entry = {sets: 0, totals: emptyTotals()};
            out.set(row.player_id, entry);
        }
        entry.sets += row.sets_played ?? 0;
        for (const key of KEYS) entry.totals[key] += Number(row[TOTAL_FIELDS[key]] ?? 0);
    }
    return out;
}

export function perSetOf(entry: PlayerTotals | undefined, key: StatKey): number | null {
    if (!entry || entry.sets <= 0) return null;
    return entry.totals[key] / entry.sets;
}
