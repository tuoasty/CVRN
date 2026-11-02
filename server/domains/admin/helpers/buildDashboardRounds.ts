import {PLAYOFF_ROUNDS} from "@/server/domains/playoff/types/schemas";
import type {DashboardMatchRow, DashboardMatchType} from "../types/dashboard";

const DAY_MS = 24 * 60 * 60 * 1000;
const WINDOW_BACK_MS = 14 * DAY_MS;
const WINDOW_FORWARD_MS = 7 * DAY_MS;
const PLAYOFF_STAGE_OFFSET = 100000;

const STAGE_ORDER = new Map<string, number>(PLAYOFF_ROUNDS.map((round, index) => [round, index]));

export interface DashboardRoundGroup {
    key: string;
    matchType: DashboardMatchType;
    week: number | null;
    playoffRound: string | null;
    rows: DashboardMatchRow[];
}

function isPendingPlayoff(row: DashboardMatchRow): boolean {
    return row.match_type === "playoffs"
        && row.status !== "completed"
        && row.home_team_id !== null
        && row.away_team_id !== null;
}

export function isDashboardMatch(
    row: DashboardMatchRow,
    isByeTeam: (teamId: string) => boolean,
    now: Date,
): boolean {
    if (row.home_team_id === null || row.away_team_id === null) return false;
    if (isByeTeam(row.home_team_id) || isByeTeam(row.away_team_id)) return false;
    if (isPendingPlayoff(row)) return true;
    if (row.scheduled_at === null) return false;

    const time = new Date(row.scheduled_at).getTime();
    return time >= now.getTime() - WINDOW_BACK_MS && time <= now.getTime() + WINDOW_FORWARD_MS;
}

export function dashboardSortAt(row: DashboardMatchRow, now: Date): number {
    const forwardMark = now.getTime() + WINDOW_FORWARD_MS;
    if (row.scheduled_at === null) return forwardMark;

    const time = new Date(row.scheduled_at).getTime();
    if (!isPendingPlayoff(row)) return time;
    return time >= now.getTime() && time <= forwardMark ? time : forwardMark;
}

export function dashboardRoundKey(row: DashboardMatchRow): string {
    if (row.match_type === "playoffs") return row.playoff_round ?? "playoffs";
    return row.week === null ? "season" : `week:${row.week}`;
}

function stageRank(group: DashboardRoundGroup): number {
    if (group.matchType === "playoffs") {
        return PLAYOFF_STAGE_OFFSET + (STAGE_ORDER.get(group.playoffRound ?? "") ?? -1);
    }
    return group.week ?? -1;
}

function compareMatchCode(a: string | null, b: string | null): number {
    if (a === b) return 0;
    if (a === null) return 1;
    if (b === null) return -1;
    return a.localeCompare(b, undefined, {numeric: true});
}

export function buildDashboardRounds(rows: DashboardMatchRow[], now: Date): DashboardRoundGroup[] {
    const groups = new Map<string, DashboardRoundGroup>();

    for (const row of rows) {
        const key = dashboardRoundKey(row);
        const group = groups.get(key) ?? {
            key,
            matchType: row.match_type,
            week: row.match_type === "season" ? row.week : null,
            playoffRound: row.match_type === "playoffs" ? row.playoff_round : null,
            rows: [],
        };
        group.rows.push(row);
        groups.set(key, group);
    }

    const sorted = [...groups.values()];
    for (const group of sorted) {
        group.rows.sort(
            (a, b) => dashboardSortAt(b, now) - dashboardSortAt(a, now) || compareMatchCode(a.match_code, b.match_code)
        );
    }

    return sorted.sort(
        (a, b) => dashboardSortAt(b.rows[0], now) - dashboardSortAt(a.rows[0], now) || stageRank(b) - stageRank(a)
    );
}
