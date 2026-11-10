import type {PlayerLeaderboardRow} from "@/server/domains/player";
import type {MatchWithDetails} from "@/server/domains/match";
import type {SeasonRosterEntry} from "@/server/domains/team/types";
import type {CardAttributes} from "@/server/domains/playerCard/types";
import type {PositionCode} from "@/shared/volleyball/positions";
import {rankValues} from "@/app/features/teams/model/strength";
import {pickProjectedStarters, type StarterCandidate, type StarterSlot} from "./projectedStarters";
import {emptyTotals, perSetOf, STAT_KEYS, sumByPlayer, TOTAL_FIELDS, type StatKey} from "./perSet";

export type StatKind = "perSet" | "pct" | "diff";

export type BreakdownGroup = "Overall" | "Attack" | "Setting" | "Block" | "Defense" | "Serve";

type StatDef = {key: string; label: string; group: BreakdownGroup; kind: StatKind; seasonOnly?: boolean};

export const BREAKDOWN_STATS: readonly StatDef[] = [
    {key: "pointDiff", label: "Point Differential", group: "Overall", kind: "diff", seasonOnly: true},
    {key: "points", label: "Points", group: "Attack", kind: "perSet"},
    {key: "kills", label: "Kills", group: "Attack", kind: "perSet"},
    {key: "delayKills", label: "Delay Kills", group: "Attack", kind: "perSet"},
    {key: "quickKills", label: "Quick Kills", group: "Attack", kind: "perSet"},
    {key: "efficiency", label: "Efficiency", group: "Attack", kind: "pct"},
    {key: "assists", label: "Assists", group: "Setting", kind: "perSet"},
    {key: "apeKills", label: "Ape Kills", group: "Setting", kind: "perSet"},
    {key: "setEfficiency", label: "Setting Efficiency", group: "Setting", kind: "pct"},
    {key: "blocks", label: "Blocks", group: "Block", kind: "perSet"},
    {key: "killBlocks", label: "Kill Blocks", group: "Block", kind: "perSet"},
    {key: "receives", label: "Receives", group: "Defense", kind: "perSet"},
    {key: "digs", label: "Digs", group: "Defense", kind: "perSet"},
    {key: "dives", label: "Dives", group: "Defense", kind: "perSet"},
    {key: "aces", label: "Aces", group: "Serve", kind: "perSet"},
];

export const PROJECTED_STATS = BREAKDOWN_STATS.filter((s) => !s.seasonOnly);
export const SEASON_STATS = BREAKDOWN_STATS;

export interface BreakdownStat {
    key: string;
    label: string;
    group: BreakdownGroup;
    kind: StatKind;
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
    positionsByPlayer: Map<string, PositionCode[]>;
}

type Values = Record<string, number | null>;

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

function valuesFrom(sums: Record<StatKey, number>, divisor: number): Values {
    const out: Values = {};
    for (const def of BREAKDOWN_STATS) {
        if (def.kind === "perSet") out[def.key] = sums[def.key as StatKey] / divisor;
    }
    out.efficiency = sums.killAttempts > 0 ? (sums.kills - sums.spikingErrors) / sums.killAttempts : null;
    const setAttempts = sums.assists + sums.settingErrors;
    out.setEfficiency = setAttempts > 0 ? sums.assists / setAttempts : null;
    return out;
}

function withRanks(teamIds: string[], stats: readonly StatDef[], values: Map<string, Values | null>): Map<string, BreakdownStat[] | null> {
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
                stats.map(({key, label, group, kind}) => ({
                    key,
                    label,
                    group,
                    kind,
                    value: own[key] ?? null,
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
    const projectedValues = new Map<string, Values | null>();

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

        const sums = emptyTotals();
        let anyRows = false;
        for (const slot of picked) {
            const entry = slot.playerId ? pre.get(slot.playerId) : undefined;
            if (!entry || entry.sets <= 0) continue;
            anyRows = true;
            for (const key of STAT_KEYS) sums[key] += perSetOf(entry, key) ?? 0;
        }
        projectedValues.set(teamId, anyRows ? valuesFrom(sums, 1) : {});
    }

    const margins = teamSetMargins(input.completedMatches);
    const seasonValues = new Map<string, Values | null>();

    for (const teamId of input.teamIds) {
        const teamRows = input.seasonRows.filter((r) => r.team_id === teamId);
        const rowSets = teamRows.reduce((sum, r) => sum + (r.sets_played ?? 0), 0);
        const margin = margins.get(teamId);
        if (!margin || margin.sets === 0 || rowSets === 0) {
            seasonValues.set(teamId, null);
            continue;
        }
        const sums = emptyTotals();
        for (const r of teamRows) {
            for (const key of STAT_KEYS) sums[key] += Number(r[TOTAL_FIELDS[key]] ?? 0);
        }
        seasonValues.set(teamId, {...valuesFrom(sums, margin.sets), pointDiff: margin.margin / margin.sets});
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
