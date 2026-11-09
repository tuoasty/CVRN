import type {PlayerMatchStatTotal} from "@/shared/types/db";
import type {LeaderboardStatRow} from "@/server/domains/player";
import type {LeaderCategory, MatchupCategory, StatCell} from "./types";

export const MATCHUP_LABELS: Record<MatchupCategory, string> = {
    setter: "Setter",
    scorer: "Top Scorer",
    blocker: "Top Blocker",
    receiver: "Top Receiver",
};

export const MATCHUP_ORDER: MatchupCategory[] = ["setter", "scorer", "blocker", "receiver"];

export const SEASON_PER_SET_FIELD = {
    setter: "assists_per_set",
    scorer: "points_per_set",
    blocker: "blocks_per_set",
    receiver: "receives_per_set",
} as const;

export const MATCH_TOTAL_FIELD = {
    setter: "assists",
    scorer: "points",
    blocker: "total_blocks",
    receiver: "total_receives",
} as const;

export const LEADER_LABELS: Record<LeaderCategory, string> = {
    points: "Points",
    assists: "Assists",
    blocks: "Blocks",
    receives: "Receives",
};

export const LEADER_ORDER: LeaderCategory[] = ["points", "assists", "blocks", "receives"];

export const LEADER_SHORT: Record<LeaderCategory, string> = {
    points: "PTS",
    assists: "AST",
    blocks: "BLK",
    receives: "REC",
};

export const SEASON_TOTAL_FIELD = {
    points: "points_total",
    assists: "assists_total",
    blocks: "blocks_total",
    receives: "receives_total",
} as const;

export const LEADER_TO_MATCH_FIELD = {
    points: "points",
    assists: "assists",
    blocks: "total_blocks",
    receives: "total_receives",
} as const;

function num(value: unknown): number {
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function byValueThenId(a: { playerId: string; value: number }, b: { playerId: string; value: number }): number {
    return b.value - a.value || a.playerId.localeCompare(b.playerId);
}

export function pickTeamLeader(rows: LeaderboardStatRow[], teamId: string, category: MatchupCategory): { playerId: string; value: number } | null {
    const team = rows.filter(r => r.team_id === teamId);
    if (team.length === 0) return null;
    const maxSets = Math.max(...team.map(r => num(r.sets_played)));
    const gate = Math.ceil(maxSets / 2);
    const field = SEASON_PER_SET_FIELD[category];
    const best = team
        .filter(r => num(r.sets_played) >= gate)
        .map(r => ({playerId: r.player_id, value: num(r[field]), sets: num(r.sets_played)}))
        .sort((a, b) => b.value - a.value || b.sets - a.sets || a.playerId.localeCompare(b.playerId))[0];
    if (!best || best.value <= 0) return null;
    return {playerId: best.playerId, value: best.value};
}

export function pickMatchLeader(
    totals: PlayerMatchStatTotal[],
    teamId: string | null,
    category: MatchupCategory | LeaderCategory,
): { playerId: string; value: number } | null {
    const field = category in MATCH_TOTAL_FIELD
        ? MATCH_TOTAL_FIELD[category as MatchupCategory]
        : LEADER_TO_MATCH_FIELD[category as LeaderCategory];
    const best = totals
        .filter(t => t.player_id && (teamId === null || t.team_id === teamId))
        .map(t => ({playerId: t.player_id as string, value: num(t[field])}))
        .sort(byValueThenId)[0];
    if (!best || best.value <= 0) return null;
    return best;
}

export function topSeasonLeaders(
    rows: LeaderboardStatRow[],
    limit = 3,
): { category: LeaderCategory; label: string; entries: { playerId: string; teamId: string | null; value: number }[] }[] {
    const anyStats = rows.some(r => LEADER_ORDER.some(c => num(r[SEASON_TOTAL_FIELD[c]]) > 0));
    if (!anyStats) return [];
    return LEADER_ORDER.map(category => ({
        category,
        label: LEADER_LABELS[category],
        entries: rows
            .map(r => ({playerId: r.player_id, teamId: r.team_id ?? null, value: num(r[SEASON_TOTAL_FIELD[category]])}))
            .filter(e => e.value > 0)
            .sort(byValueThenId)
            .slice(0, limit),
    }));
}

type LineSpec = { label: string; season: string; match: string; pct?: boolean };

const MATCHUP_LINES: Record<MatchupCategory, LineSpec[]> = {
    setter: [
        {label: "AST", season: "assists_per_set", match: "assists"},
        {label: "SET%", season: "set_eff", match: "set_eff", pct: true},
        {label: "APK", season: "ape_kills_per_set", match: "ape_kills"},
    ],
    scorer: [
        {label: "PTS", season: "points_per_set", match: "points"},
        {label: "K", season: "kills_per_set", match: "total_kills"},
        {label: "HIT%", season: "hit_eff", match: "hit_eff", pct: true},
    ],
    blocker: [
        {label: "BLK", season: "blocks_per_set", match: "total_blocks"},
        {label: "KB", season: "kill_blocks_per_set", match: "kill_blocks"},
        {label: "KB%", season: "kb_pct", match: "kb_pct", pct: true},
    ],
    receiver: [
        {label: "REC", season: "receives_per_set", match: "total_receives"},
        {label: "DIG", season: "digs_per_set", match: "digs"},
        {label: "DIV", season: "dives_per_set", match: "dives"},
    ],
};

export function matchupLine(category: MatchupCategory, row: Record<string, unknown>, source: "season" | "match"): StatCell[] {
    return MATCHUP_LINES[category].map(spec => {
        const raw = row[source === "season" ? spec.season : spec.match];
        const hasValue = typeof raw === "number" && Number.isFinite(raw);
        if (spec.pct) return {label: spec.label, value: hasValue ? `${((raw as number) * 100).toFixed(1)}%` : "-"};
        const value = hasValue ? (raw as number) : 0;
        return source === "season"
            ? {label: `${spec.label}/set`, value: value.toFixed(1)}
            : {label: spec.label, value: String(Math.round(value))};
    });
}
