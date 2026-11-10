import type {StandingWithInfo} from "@/server/domains/standing";
import type {MatchWithDetails} from "@/server/domains/match";
import type {StandingMethod} from "@/shared/types/standing";
import type {
    BuildStandingsTableInput,
    FormEntry,
    NextFixture,
    SortColumn,
    StandingsRow,
    StandingsTableModel,
    TeamRef,
    ZoneRule,
} from "./types";

const FORM_LENGTH = 5;

export function sortColumnFor(method: StandingMethod): SortColumn {
    if (method === "points") return "w";
    if (method === "points_without_bonus") return "pts";
    return "lvr";
}

export function metricFor(standing: StandingWithInfo, method: StandingMethod): number {
    if (method === "points") return (standing.total_points ?? 0) + (standing.total_bonus ?? 0);
    if (method === "points_without_bonus") return standing.total_points ?? 0;
    return standing.total_lvr ?? 0;
}

export function zoneRules(qualified: number | null | undefined, playin: number | null | undefined, teamCount: number): ZoneRule[] {
    if (!qualified || qualified <= 0) return [];
    const p = playin && playin > 0 ? playin : 0;
    const rules: ZoneRule[] = [];
    if (teamCount > qualified) rules.push({afterRank: qualified, label: p > 0 ? "Play-in" : "Out", variant: "solid"});
    if (p > 0 && teamCount > qualified + p) rules.push({afterRank: qualified + p, label: "Out", variant: "dashed"});
    return rules;
}

function compareNullable<T>(a: T | null | undefined, b: T | null | undefined, cmp: (x: T, y: T) => number): number {
    const aMissing = a === null || a === undefined;
    const bMissing = b === null || b === undefined;
    if (aMissing && bMissing) return 0;
    if (aMissing) return 1;
    if (bMissing) return -1;
    return cmp(a as T, b as T);
}

function compareSchedule(a: MatchWithDetails, b: MatchWithDetails): number {
    return compareNullable(a.match.week, b.match.week, (x, y) => x - y)
        || compareNullable(a.match.scheduled_at, b.match.scheduled_at, (x, y) => new Date(x).getTime() - new Date(y).getTime())
        || a.match.id.localeCompare(b.match.id);
}

function seasonOnly(matches: MatchWithDetails[]): MatchWithDetails[] {
    return matches.filter(m => m.match.match_type === "season").sort(compareSchedule);
}

function toTeamRef(s: StandingWithInfo & {team_id: string}): TeamRef {
    return {
        id: s.team_id,
        name: s.team_name ?? "Unknown team",
        slug: s.team_slug,
        logoUrl: s.team_logo_url,
        logoBgRemoved: s.team_logo_bg_removed ?? false,
    };
}

function involves(m: MatchWithDetails, teamId: string): boolean {
    return m.match.home_team_id === teamId || m.match.away_team_id === teamId;
}

function opponentId(m: MatchWithDetails, teamId: string): string | null {
    return m.match.home_team_id === teamId ? m.match.away_team_id : m.match.home_team_id;
}

function buildForm(teamId: string, completed: MatchWithDetails[], lookup: Map<string, TeamRef>): FormEntry[] {
    return completed.filter(m => involves(m, teamId)).slice(-FORM_LENGTH).map(m => {
        const isHome = m.match.home_team_id === teamId;
        const teamSets = (isHome ? m.match.home_sets_won : m.match.away_sets_won) ?? 0;
        const opponentSets = (isHome ? m.match.away_sets_won : m.match.home_sets_won) ?? 0;
        const oppId = opponentId(m, teamId);
        return {
            matchId: m.match.id,
            matchCode: m.match.match_code,
            outcome: teamSets > opponentSets ? "W" : "L",
            teamSets,
            opponentSets,
            opponent: oppId ? lookup.get(oppId) ?? null : null,
            homeTeamName: m.match.home_team_id ? lookup.get(m.match.home_team_id)?.name ?? null : null,
            awayTeamName: m.match.away_team_id ? lookup.get(m.match.away_team_id)?.name ?? null : null,
        };
    });
}

function findNext(teamId: string, upcoming: MatchWithDetails[], lookup: Map<string, TeamRef>): NextFixture | null {
    const team = lookup.get(teamId);
    for (const m of upcoming) {
        if (!involves(m, teamId)) continue;
        const oppId = opponentId(m, teamId);
        const opponent = oppId ? lookup.get(oppId) : undefined;
        if (!team || !opponent) continue;
        const isHome = m.match.home_team_id === teamId;
        return {
            matchId: m.match.id,
            matchCode: m.match.match_code,
            opponent,
            scheduledAt: m.match.scheduled_at,
            week: m.match.week,
            homeTeamName: isHome ? team.name : opponent.name,
            awayTeamName: isHome ? opponent.name : team.name,
        };
    }
    return null;
}

export function buildStandingsTable(input: BuildStandingsTableInput): StandingsTableModel {
    const valid = input.standings
        .filter((s): s is StandingWithInfo & {team_id: string} => s.team_id !== null)
        .sort((a, b) => compareNullable(a.rank, b.rank, (x, y) => x - y));
    const lookup = new Map(valid.map(s => [s.team_id, toTeamRef(s)]));
    const completed = seasonOnly(input.completed);
    const upcoming = seasonOnly(input.upcoming);

    const rows: StandingsRow[] = valid.map(s => {
        const wins = s.wins ?? 0;
        const losses = s.losses ?? 0;
        const setsWon = s.sets_won ?? 0;
        const setsLost = s.sets_lost ?? 0;
        return {
            rank: s.rank,
            team: lookup.get(s.team_id)!,
            played: wins + losses,
            wins,
            losses,
            setsWon,
            setsLost,
            setDiff: setsWon - setsLost,
            metric: metricFor(s, input.method),
            form: buildForm(s.team_id, completed, lookup),
            next: findNext(s.team_id, upcoming, lookup),
        };
    });

    const qualified = input.qualifiedTeams && input.qualifiedTeams > 0 ? input.qualifiedTeams : null;
    return {
        method: input.method,
        sortColumn: sortColumnFor(input.method),
        rows,
        zones: zoneRules(input.qualifiedTeams, input.playinTeams, rows.length),
        showNext: rows.some(r => r.next !== null),
        qualifiedTeams: qualified,
        playinTeams: input.playinTeams && input.playinTeams > 0 ? input.playinTeams : 0,
        hasCarryInPoints: valid.some(s => (s.starting_points ?? 0) > 0),
    };
}
