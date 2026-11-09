import type {PlayerMatchStatTotal, Standing} from "@/shared/types/db";
import type {MatchWithDetails} from "@/server/domains/match";
import type {LeaderboardStatRow} from "@/server/domains/player";
import {MATCHUP_LABELS, MATCHUP_ORDER, matchupLine, pickMatchLeader, pickTeamLeader} from "./leaders";
import {getMatchTypeLabel} from "@/app/utils/matchLabel";
import type {FormEntry, LeaderCell, Matchup, MatchupCategory, Tape, TapeSide} from "./types";

type ResolvePlayer = (playerId: string) => { name: string; username?: string | null; avatarUrl: string | null; href: string | null } | null;

export function standingRating(standing: Standing, standingMethod: string): number {
    if (standingMethod === "lvr") return standing.total_lvr ?? 0;
    const points = standing.total_points ?? 0;
    return standingMethod === "points" ? points + (standing.total_bonus ?? 0) : points;
}

function sortedByTime(matches: MatchWithDetails[]): MatchWithDetails[] {
    return [...matches].sort((a, b) => (a.match.scheduled_at ?? "").localeCompare(b.match.scheduled_at ?? ""));
}

function involves(m: MatchWithDetails, teamId: string): boolean {
    return m.match.home_team_id === teamId || m.match.away_team_id === teamId;
}

function setsFor(m: MatchWithDetails, teamId: string): { mine: number; theirs: number } {
    const home = m.match.home_sets_won ?? 0;
    const away = m.match.away_sets_won ?? 0;
    return m.match.home_team_id === teamId ? {mine: home, theirs: away} : {mine: away, theirs: home};
}

function tapeSide(teamId: string, standings: Standing[], standingMethod: string, completed: MatchWithDetails[], teamName: (id: string) => string | null): TapeSide | null {
    const standing = standings.find(s => s.team_id === teamId);
    if (!standing) return null;
    const form = sortedByTime(completed.filter(m => involves(m, teamId)))
        .slice(-5)
        .map((m): FormEntry => {
            const {mine, theirs} = setsFor(m, teamId);
            const opponentId = m.match.home_team_id === teamId ? m.match.away_team_id : m.match.home_team_id;
            return {
                result: mine > theirs ? "W" : "L",
                opponent: (opponentId && teamName(opponentId)) || "TBD",
                score: `${mine}-${theirs}`,
                label: getMatchTypeLabel(m.match.match_type, m.match.week, m.playoff_round ?? null),
            };
        });
    return {
        record: `${standing.wins ?? 0}-${standing.losses ?? 0}`,
        rank: standing.rank ?? null,
        rating: standingRating(standing, standingMethod),
        form,
    };
}

function cell(
    pick: { playerId: string; value: number } | null,
    resolve: ResolvePlayer,
    category: MatchupCategory,
    row: Record<string, unknown> | undefined,
    source: "season" | "match",
): LeaderCell | null {
    if (!pick) return null;
    const who = resolve(pick.playerId);
    if (!who) return null;
    return {
        playerId: pick.playerId,
        name: who.name,
        username: who.username ?? null,
        avatarUrl: who.avatarUrl,
        href: who.href,
        value: source === "season" ? Math.round(pick.value * 10) / 10 : pick.value,
        line: row ? matchupLine(category, row, source) : [],
    };
}

export function buildTape(input: {
    homeTeamId: string;
    awayTeamId: string;
    standings: Standing[];
    standingMethod: string;
    completed: MatchWithDetails[];
    leaderRows: LeaderboardStatRow[];
    matchTotals: PlayerMatchStatTotal[] | null;
    before: string | null;
    resolvePlayer: ResolvePlayer;
    teamName: (teamId: string) => string | null;
}): Tape {
    const {homeTeamId, awayTeamId} = input;
    const prior = input.before
        ? input.completed.filter(m => !!m.match.scheduled_at && m.match.scheduled_at < (input.before as string))
        : input.completed;
    const fromMatch = input.matchTotals !== null;
    const matchups: Matchup[] = MATCHUP_ORDER.flatMap(category => {
        const side = (teamId: string) => {
            if (fromMatch) {
                const pick = pickMatchLeader(input.matchTotals ?? [], teamId, category);
                const row = (input.matchTotals ?? []).find(t => t.player_id === pick?.playerId && t.team_id === teamId);
                return cell(pick, input.resolvePlayer, category, row as Record<string, unknown> | undefined, "match");
            }
            const pick = pickTeamLeader(input.leaderRows, teamId, category);
            const row = input.leaderRows.find(r => r.player_id === pick?.playerId && r.team_id === teamId);
            return cell(pick, input.resolvePlayer, category, row as Record<string, unknown> | undefined, "season");
        };
        const home = side(homeTeamId);
        const away = side(awayTeamId);
        return home || away ? [{category, label: MATCHUP_LABELS[category], home, away}] : [];
    });

    return {
        ratingLabel: input.standingMethod === "lvr" ? "LVR" : "Points",
        home: tapeSide(homeTeamId, input.standings, input.standingMethod, prior, input.teamName),
        away: tapeSide(awayTeamId, input.standings, input.standingMethod, prior, input.teamName),
        matchups,
        matchupUnit: fromMatch ? "this match" : "per set",
    };
}
