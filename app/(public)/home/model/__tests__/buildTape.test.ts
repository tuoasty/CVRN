import {describe, expect, it} from "vitest";
import {buildTape} from "../buildTape";
import {AWAY, HOME, makeLeaderRow, makeMatch, makeStanding, makeTotal} from "./fixtures";
import type {MatchWithDetails} from "@/server/domains/match";
import type {LeaderboardStatRow} from "@/server/domains/player";
import type {PlayerMatchStatTotal, Standing} from "@/shared/types/db";

const resolvePlayer = (id: string) => ({name: id.toUpperCase(), avatarUrl: null, href: `/players/${id}`});

function tape(o: {
    standings?: Standing[];
    standingMethod?: string;
    completed?: MatchWithDetails[];
    leaderRows?: LeaderboardStatRow[];
    matchTotals?: PlayerMatchStatTotal[] | null;
    before?: string | null;
}) {
    return buildTape({
        homeTeamId: HOME,
        awayTeamId: AWAY,
        standings: o.standings ?? [makeStanding({team_id: HOME}), makeStanding({team_id: AWAY, rank: 2})],
        standingMethod: o.standingMethod ?? "lvr",
        completed: o.completed ?? [],
        leaderRows: o.leaderRows ?? [],
        matchTotals: o.matchTotals ?? null,
        before: o.before ?? null,
        resolvePlayer,
        teamName: (id: string) => id.toUpperCase(),
    });
}

function result(home: string, away: string, hs: number, as: number, when: string, week = 1): MatchWithDetails {
    return makeMatch({status: "completed", home_team_id: home, away_team_id: away, home_sets_won: hs, away_sets_won: as, scheduled_at: when, week});
}

describe("buildTape", () => {
    it("LVR region uses total_lvr", () => {
        const t = tape({standings: [makeStanding({team_id: HOME, total_lvr: 112.4, wins: 5, losses: 1})]});
        expect(t.ratingLabel).toBe("LVR");
        expect(t.home).toMatchObject({rating: 112.4, record: "5-1", rank: 1});
    });

    it("points region adds bonus", () => {
        const t = tape({standingMethod: "points", standings: [makeStanding({team_id: HOME, total_points: 20, total_bonus: 3})]});
        expect(t.ratingLabel).toBe("Points");
        expect(t.home?.rating).toBe(23);
    });

    it("points_without_bonus excludes bonus", () => {
        const t = tape({standingMethod: "points_without_bonus", standings: [makeStanding({team_id: HOME, total_points: 20, total_bonus: 3})]});
        expect(t.home?.rating).toBe(20);
    });

    it("team without a standings row gets a null side", () => {
        const t = tape({standings: [makeStanding({team_id: HOME})]});
        expect(t.away).toBeNull();
    });

    it("form is the last five, oldest first", () => {
        const games = [
            result(HOME, "c", 3, 0, "2026-10-01T00:00:00Z"),
            result(HOME, "d", 0, 3, "2026-10-02T00:00:00Z"),
            result("e", HOME, 3, 1, "2026-10-03T00:00:00Z"),
            result(HOME, "f", 3, 2, "2026-10-04T00:00:00Z"),
            result(HOME, "g", 3, 1, "2026-10-05T00:00:00Z"),
            result("h", HOME, 0, 3, "2026-10-06T00:00:00Z"),
        ];
        expect(tape({completed: [...games].reverse()}).home?.form.map(f => f.result)).toEqual(["L", "L", "W", "W", "W"]);
    });

    it("form only counts matches before the hero match", () => {
        const early = result(HOME, "c", 3, 0, "2026-10-01T00:00:00Z");
        const later = result(HOME, "d", 0, 3, "2026-10-09T00:00:00Z");
        expect(tape({completed: [later, early], before: "2026-10-05T00:00:00Z"}).home?.form.map(f => f.result)).toEqual(["W"]);
    });

    it("form entries name the opponent, the score from the team's side and the round", () => {
        const away = result("rival", HOME, 3, 1, "2026-10-03T00:00:00Z", 2);
        expect(tape({completed: [away]}).home?.form).toEqual([{result: "L", opponent: "RIVAL", score: "1-3", label: "Week 2"}]);
    });

    it("leader cells carry a stat line from their source row", () => {
        const t = tape({leaderRows: [makeLeaderRow({player_id: "h1", team_id: HOME, assists_per_set: 8, set_eff: 0.5, ape_kills_per_set: 0.2})]});
        expect(t.matchups[0].home?.line).toEqual([
            {label: "AST/set", value: "8.0"},
            {label: "SET%", value: "50.0%"},
            {label: "APK/set", value: "0.2"},
        ]);
    });

    it("upcoming match uses season leaders per set", () => {
        const t = tape({leaderRows: [
            makeLeaderRow({player_id: "h1", team_id: HOME, assists_per_set: 8.26}),
            makeLeaderRow({player_id: "a1", team_id: AWAY, assists_per_set: 7.5}),
        ]});
        expect(t.matchupUnit).toBe("per set");
        expect(t.matchups).toHaveLength(1);
        expect(t.matchups[0]).toMatchObject({category: "setter", label: "Setter", home: {playerId: "h1", value: 8.3, name: "H1"}, away: {playerId: "a1", value: 7.5}});
    });

    it("final match uses matchTotals and 'this match'", () => {
        const t = tape({
            leaderRows: [makeLeaderRow({player_id: "season", team_id: HOME, points_per_set: 50})],
            matchTotals: [makeTotal({player_id: "m1", team_id: HOME, points: 27}), makeTotal({player_id: "m2", team_id: AWAY, points: 19})],
        });
        expect(t.matchupUnit).toBe("this match");
        expect(t.matchups.map(m => m.category)).toEqual(["scorer"]);
        expect(t.matchups[0].home?.playerId).toBe("m1");
    });
});
