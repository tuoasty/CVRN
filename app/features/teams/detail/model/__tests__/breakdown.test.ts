import {describe, expect, it} from "vitest";
import type {PlayerLeaderboardRow} from "@/server/domains/player";
import type {MatchWithDetails} from "@/server/domains/match";
import type {SeasonRosterEntry} from "@/server/domains/team/types";
import type {CardAttributes} from "@/server/domains/playerCard/types";
import type {PositionCode} from "@/shared/volleyball/positions";
import {buildSeasonBreakdown} from "../breakdown";

function row(o: Partial<PlayerLeaderboardRow> & {player_id: string}): PlayerLeaderboardRow {
    return {
        season_id: "s-prev",
        region_id: "r1",
        team_id: null,
        sets_played: 10,
        points_per_set: 0,
        kills_per_set: 0,
        assists_per_set: 0,
        blocks_per_set: 0,
        receives_per_set: 0,
        aces_per_set: 0,
        points_total: 0,
        kills_total: 0,
        assists_total: 0,
        blocks_total: 0,
        receives_total: 0,
        aces_total: 0,
        position_counts: {},
        ...o,
    } as unknown as PlayerLeaderboardRow;
}

function roster(teamId: string, playerId: string, position: PositionCode | null): SeasonRosterEntry {
    return {teamId, playerId, displayName: playerId, username: playerId, avatarUrl: null, position, role: "player"};
}

function card(playerId: string, o: Partial<CardAttributes> = {}): CardAttributes {
    return {playerId, seasonNumber: 2, ovr: 70, scoring: 50, spiking: 50, setting: 50, blocking: 50, receiving: 50, serving: 50, ...o};
}

function match(
    id: string,
    home: string,
    away: string,
    sets: [number, number][],
    o: {forfeit?: boolean; status?: string} = {},
): MatchWithDetails {
    return {
        match: {
            id,
            home_team_id: home,
            away_team_id: away,
            status: o.status ?? "completed",
            is_forfeit: o.forfeit ?? false,
        },
        sets: sets.map(([h, a], i) => ({id: `${id}-${i}`, match_id: id, set_number: i + 1, home_score: h, away_score: a})),
        officials: [],
    } as unknown as MatchWithDetails;
}

const base = {
    teamIds: ["a", "b", "c"],
    rosters: [] as SeasonRosterEntry[],
    preCutoffRows: [] as PlayerLeaderboardRow[],
    previousCards: [] as CardAttributes[],
    seasonRows: [] as PlayerLeaderboardRow[],
    completedMatches: [] as MatchWithDetails[],
    positionsByPlayer: new Map<string, PositionCode[]>(),
};

function stat(list: {key: string; value: number | null; rank: number | null}[] | null, key: string) {
    return list?.find((s) => s.key === key);
}

describe("buildSeasonBreakdown projected", () => {
    it("sums starters' pre-cutoff per-set values and ranks with ties", () => {
        const out = buildSeasonBreakdown({
            ...base,
            rosters: [roster("a", "a1", "SET"), roster("b", "b1", "SET"), roster("c", "c1", "SET")],
            previousCards: [card("a1"), card("b1"), card("c1")],
            positionsByPlayer: new Map([["a1", ["SET"]], ["b1", ["SET"]], ["c1", ["SET"]]]),
            preCutoffRows: [
                row({player_id: "a1", points_total: 30}),
                row({player_id: "b1", points_total: 50}),
                row({player_id: "c1", points_total: 50}),
            ],
        });
        expect(stat(out.get("b")!.projected, "points")).toMatchObject({key: "points", label: "Points", group: "Attack", kind: "perSet", value: 5, rank: 1});
        expect(stat(out.get("c")!.projected, "points")?.rank).toBe(1);
        expect(stat(out.get("a")!.projected, "points")?.rank).toBe(3);
    });

    it("leaves projected values null and unranked for a team with no history", () => {
        const out = buildSeasonBreakdown({
            ...base,
            rosters: [roster("a", "new1", "OUT"), roster("b", "b1", "SET")],
            previousCards: [card("b1")],
            positionsByPlayer: new Map([["new1", ["OUT"]], ["b1", ["SET"]]]),
            preCutoffRows: [row({player_id: "b1", points_total: 20})],
        });
        const a = out.get("a")!;
        expect(a.starters.every((s) => s.playerId === null)).toBe(true);
        expect(a.projected.every((s) => s.value === null && s.rank === null)).toBe(true);
        expect(stat(out.get("b")!.projected, "points")?.rank).toBe(1);
    });

    it("aggregates a player's pre-cutoff rows across regions weighted by sets", () => {
        const out = buildSeasonBreakdown({
            ...base,
            teamIds: ["a"],
            rosters: [roster("a", "a1", "SET")],
            previousCards: [card("a1")],
            positionsByPlayer: new Map([["a1", ["SET"]]]),
            preCutoffRows: [
                row({player_id: "a1", region_id: "r1", sets_played: 10, points_total: 10}),
                row({player_id: "a1", region_id: "r2", sets_played: 30, points_total: 90, season_id: "s-other"}),
            ],
        });
        expect(stat(out.get("a")!.projected, "points")?.value).toBeCloseTo(2.5, 5);
    });

    it("pools efficiency across starters instead of adding percentages", () => {
        const out = buildSeasonBreakdown({
            ...base,
            teamIds: ["a"],
            rosters: [roster("a", "s1", "SET"), roster("a", "o1", "OUT")],
            previousCards: [card("s1", {setting: 90}), card("o1", {spiking: 90})],
            positionsByPlayer: new Map([["s1", ["SET"]], ["o1", ["OUT"]]]),
            preCutoffRows: [
                row({player_id: "s1", sets_played: 10, kills_total: 2, spiking_errors_total: 0, kill_attempts_total: 4}),
                row({player_id: "o1", sets_played: 10, kills_total: 40, spiking_errors_total: 10, kill_attempts_total: 96}),
            ],
        });
        expect(stat(out.get("a")!.projected, "efficiency")).toMatchObject({kind: "pct", group: "Attack"});
        expect(stat(out.get("a")!.projected, "efficiency")?.value).toBeCloseTo(32 / 100, 5);
    });

    it("puts ape kills and a pooled set efficiency under Setting", () => {
        const out = buildSeasonBreakdown({
            ...base,
            teamIds: ["a"],
            rosters: [roster("a", "s1", "SET"), roster("a", "o1", "OUT")],
            previousCards: [card("s1", {setting: 90}), card("o1", {spiking: 90})],
            positionsByPlayer: new Map([["s1", ["SET"]], ["o1", ["OUT"]]]),
            preCutoffRows: [
                row({player_id: "s1", sets_played: 10, assists_total: 90, setting_errors_total: 10, ape_kills_total: 20}),
                row({player_id: "o1", sets_played: 10, assists_total: 0, setting_errors_total: 0}),
            ],
        });
        const projected = out.get("a")!.projected;
        expect(stat(projected, "apeKills")).toMatchObject({group: "Setting", value: 2});
        expect(stat(projected, "setEfficiency")).toMatchObject({group: "Setting", kind: "pct"});
        expect(stat(projected, "setEfficiency")?.value).toBeCloseTo(0.9, 5);
        expect(projected.filter((s) => s.group === "Setting").map((s) => s.key)).toEqual(["assists", "apeKills", "setEfficiency"]);
    });

    it("has no point differential or set diff in projected", () => {
        const out = buildSeasonBreakdown({...base, teamIds: ["a"]});
        expect(stat(out.get("a")!.projected, "pointDiff")).toBeUndefined();
        expect(stat(out.get("a")!.projected, "setDiff")).toBeUndefined();
    });
});

describe("buildSeasonBreakdown this season", () => {
    it("is null before the team has a completed non-forfeit match with stats", () => {
        const out = buildSeasonBreakdown({
            ...base,
            completedMatches: [match("m1", "a", "b", [], {forfeit: true})],
            seasonRows: [row({player_id: "a1", team_id: "a", season_id: "s-now", sets_played: 0})],
        });
        expect(out.get("a")!.season).toBeNull();
    });

    it("excludes forfeits from point differential and the sets divisor", () => {
        const out = buildSeasonBreakdown({
            ...base,
            completedMatches: [
                match("m1", "a", "b", [[25, 20], [20, 25], [25, 15]]),
                match("m2", "c", "a", [], {forfeit: true}),
                match("m3", "c", "a", [[25, 23], [25, 23]], {forfeit: true}),
            ],
            seasonRows: [
                row({player_id: "a1", team_id: "a", season_id: "s-now", sets_played: 3, kills_total: 6, points_total: 9, kill_attempts_total: 20, spiking_errors_total: 2}),
                row({player_id: "a2", team_id: "a", season_id: "s-now", sets_played: 2, kills_total: 3, points_total: 3, kill_attempts_total: 10, spiking_errors_total: 1}),
                row({player_id: "b1", team_id: "b", season_id: "s-now", sets_played: 3, kills_total: 3, points_total: 3}),
            ],
        });
        const a = out.get("a")!.season!;
        expect(stat(a, "pointDiff")?.value).toBeCloseTo(10 / 3, 5);
        expect(stat(a, "kills")?.value).toBeCloseTo(3, 5);
        expect(stat(a, "points")?.value).toBeCloseTo(4, 5);
        expect(stat(a, "setDiff")).toBeUndefined();
        expect(stat(a, "pointDiff")).toMatchObject({label: "Point Differential", group: "Overall", kind: "diff"});
        expect(stat(a, "efficiency")?.value).toBeCloseTo(6 / 30, 5);
        expect(stat(out.get("b")!.season, "pointDiff")?.value).toBeCloseTo(-10 / 3, 5);
        expect(stat(a, "pointDiff")?.rank).toBe(1);
        expect(out.get("c")!.season).toBeNull();
    });
});
