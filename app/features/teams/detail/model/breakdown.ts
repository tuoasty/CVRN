import type {PlayerLeaderboardRow} from "@/server/domains/player";
import type {MatchWithDetails} from "@/server/domains/match";
import type {StandingWithInfo} from "@/server/domains/standing";
import type {SeasonRosterEntry} from "@/server/domains/team/types";
import type {CardAttributes} from "@/server/domains/playerCard/types";
import type {PositionCode} from "@/shared/volleyball/positions";
import {rankValues} from "@/app/features/teams/model/strength";
import {pickProjectedStarters, type StarterCandidate, type StarterSlot} from "./projectedStarters";
import {perSetOf, sumByPlayer, TOTAL_FIELDS, type StatKey} from "./perSet";

export const PROJECTED_STATS = [
    {key: "points", label: "Points"},
    {key: "kills", label: "Kills"},
    {key: "assists", label: "Assists"},
    {key: "blocks", label: "Blocks"},
    {key: "receives", label: "Receives"},
    {key: "aces", label: "Aces"},
] as const satisfies readonly {key: StatKey; label: string}[];

export const SEASON_STATS = [
    {key: "pointDiff", label: "Point diff"},
    {key: "setDiff", label: "Set diff (total)"},
    ...PROJECTED_STATS,
] as const;

export interface BreakdownStat {
    key: string;
    label: string;
    value: number | null;
    rank: number | null;
}

export interface TeamBreakdown {
    teamId: string;
    projected: BreakdownStat[];
    starters: StarterSlot[];
    season: BreakdownStat[] | null;
}

export interface SeasonBreakdownInput {
    teamIds: string[];
    rosters: SeasonRosterEntry[];
    preCutoffRows: PlayerLeaderboardRow[];
    previousCards: CardAttributes[];
    seasonRows: PlayerLeaderboardRow[];
    completedMatches: MatchWithDetails[];
    standings: StandingWithInfo[];
    positionsByPlayer: Map<string, PositionCode[]>;
}

function bestCards(cards: CardAttributes[]): Map<string, CardAttributes> {
    const out = new Map<string, CardAttributes>();
    for (const c of cards) {
        const current = out.get(c.playerId);
        if (!current || c.ovr > current.ovr) out.set(c.playerId, c);
    }
    return out;
}

function teamSetMargins(matches: MatchWithDetails[]): Map<string, {sets: number; margin: number}> {
    const out = new Map<string, {sets: number; margin: number}>();
    const add = (teamId: string | null, sets: number, margin: number) => {
        if (!teamId) return;
        const entry = out.get(teamId) ?? {sets: 0, margin: 0};
        entry.sets += sets;
        entry.margin += margin;
        out.set(teamId, entry);
    };
    for (const {match, sets} of matches) {
        if (match.status !== "completed" || match.is_forfeit || sets.length === 0) continue;
        const homeMargin = sets.reduce((sum, s) => sum + (s.home_score - s.away_score), 0);
        add(match.home_team_id, sets.length, homeMargin);
        add(match.away_team_id, sets.length, -homeMargin);
    }
    return out;
}

function withRanks<K extends string>(
    teamIds: string[],
    stats: readonly {key: K; label: string}[],
    values: Map<string, Record<K, number | null> | null>,
): Map<string, BreakdownStat[] | null> {
    const ranks = new Map(
        stats.map(({key}) => [
            key,
            rankValues(
                teamIds.map((id) => ({id, value: values.get(id)?.[key] ?? null})),
                "desc",
            ),
        ]),
    );
    return new Map(
        teamIds.map((id) => {
            const own = values.get(id);
            if (!own) return [id, null];
            return [
                id,
                stats.map(({key, label}) => ({
                    key,
                    label,
                    value: own[key],
                    rank: ranks.get(key)?.get(id)?.rank ?? null,
                })),
            ];
        }),
    );
}

export function buildSeasonBreakdown(input: SeasonBreakdownInput): Map<string, TeamBreakdown> {
    const pre = sumByPlayer(input.preCutoffRows);
    const cards = bestCards(input.previousCards);

    const starters = new Map<string, StarterSlot[]>();
    const projectedValues = new Map<string, Record<StatKey, number | null>>();

    for (const teamId of input.teamIds) {
        const candidates: StarterCandidate[] = input.rosters
            .filter((r) => r.teamId === teamId)
            .map((r) => {
                const totals = pre.get(r.playerId);
                const hasRows = !!totals && totals.sets > 0;
                return {
                    playerId: r.playerId,
                    positions: input.positionsByPlayer.get(r.playerId) ?? [],
                    card: cards.get(r.playerId) ?? null,
                    perSet: hasRows
                        ? {
                              assists: perSetOf(totals, "assists") ?? 0,
                              receives: perSetOf(totals, "receives") ?? 0,
                              blocks: perSetOf(totals, "blocks") ?? 0,
                              kills: perSetOf(totals, "kills") ?? 0,
                          }
                        : null,
                };
            });

        const picked = pickProjectedStarters(candidates);
        starters.set(teamId, picked);

        const values = {} as Record<StatKey, number | null>;
        for (const {key} of PROJECTED_STATS) {
            let sum: number | null = null;
            for (const slot of picked) {
                if (!slot.playerId) continue;
                const v = perSetOf(pre.get(slot.playerId), key);
                if (v !== null) sum = (sum ?? 0) + v;
            }
            values[key] = sum;
        }
        projectedValues.set(teamId, values);
    }

    const margins = teamSetMargins(input.completedMatches);
    const standingByTeam = new Map(input.standings.filter((s) => s.team_id).map((s) => [s.team_id as string, s]));
    type SeasonKey = (typeof SEASON_STATS)[number]["key"];
    const seasonValues = new Map<string, Record<SeasonKey, number | null> | null>();

    for (const teamId of input.teamIds) {
        const teamRows = input.seasonRows.filter((r) => r.team_id === teamId);
        const rowSets = teamRows.reduce((sum, r) => sum + (r.sets_played ?? 0), 0);
        const margin = margins.get(teamId);
        if (!margin || margin.sets === 0 || rowSets === 0) {
            seasonValues.set(teamId, null);
            continue;
        }
        const standing = standingByTeam.get(teamId);
        const values = {
            pointDiff: margin.margin / margin.sets,
            setDiff: standing ? (standing.sets_won ?? 0) - (standing.sets_lost ?? 0) : null,
        } as Record<SeasonKey, number | null>;
        for (const {key} of PROJECTED_STATS) {
            const total = teamRows.reduce((sum, r) => sum + Number(r[TOTAL_FIELDS[key]] ?? 0), 0);
            values[key] = total / margin.sets;
        }
        seasonValues.set(teamId, values);
    }

    const projected = withRanks(input.teamIds, PROJECTED_STATS, projectedValues);
    const season = withRanks(input.teamIds, SEASON_STATS, seasonValues);

    return new Map(
        input.teamIds.map((teamId) => [
            teamId,
            {
                teamId,
                projected: projected.get(teamId) ?? [],
                starters: starters.get(teamId) ?? [],
                season: season.get(teamId) ?? null,
            },
        ]),
    );
}
