import {describe, expect, it} from "vitest";
import type {PlayerLeaderboardRow} from "@/server/domains/player";
import {buildLeaders} from "../leaders";

function row(o: Partial<PlayerLeaderboardRow> & {player_id: string}): PlayerLeaderboardRow {
    return {
        season_id: "s-now",
        region_id: "r1",
        sets_played: 0,
        points_per_set: null,
        assists_per_set: null,
        blocks_per_set: null,
        receives_per_set: null,
        points_total: 0,
        assists_total: 0,
        blocks_total: 0,
        receives_total: 0,
        ...o,
    } as unknown as PlayerLeaderboardRow;
}

describe("buildLeaders", () => {
    it("prefers a 6-set player over a 2-set player with a higher value", () => {
        const out = buildLeaders({
            rosterIds: ["a", "b"],
            seasonRows: [
                row({player_id: "a", sets_played: 6, points_total: 18}),
                row({player_id: "b", sets_played: 2, points_total: 10}),
            ],
            careerRows: [],
        });
        expect(out.source).toBe("season");
        expect(out.leaders.find((l) => l.key === "points")).toMatchObject({playerId: "a", value: 3});
    });

    it("takes the highest value when nobody has 6 sets", () => {
        const out = buildLeaders({
            rosterIds: ["a", "b"],
            seasonRows: [
                row({player_id: "a", sets_played: 3, points_total: 6}),
                row({player_id: "b", sets_played: 2, points_total: 10}),
            ],
            careerRows: [],
        });
        expect(out.leaders.find((l) => l.key === "points")?.playerId).toBe("b");
    });

    it("uses all-time rows until a roster player has a season set, then flips to season", () => {
        const career = [
            row({player_id: "a", season_id: "old", sets_played: 20, assists_total: 100}),
            row({player_id: "a", season_id: "old2", region_id: "r2", sets_played: 20, assists_total: 20}),
        ];
        const before = buildLeaders({rosterIds: ["a"], seasonRows: [row({player_id: "a", sets_played: 0})], careerRows: career});
        expect(before.source).toBe("alltime");
        expect(before.leaders.find((l) => l.key === "assists")).toMatchObject({playerId: "a", value: 3});

        const after = buildLeaders({
            rosterIds: ["a"],
            seasonRows: [row({player_id: "a", sets_played: 1, assists_total: 9})],
            careerRows: career,
        });
        expect(after.source).toBe("season");
        expect(after.leaders.find((l) => l.key === "assists")?.value).toBe(9);
    });

    it("drops a stat whose best value shows as 0.0", () => {
        const out = buildLeaders({
            rosterIds: ["a"],
            seasonRows: [row({player_id: "a", sets_played: 30, points_total: 30, assists_total: 0, blocks_total: 1})],
            careerRows: [],
        });
        expect(out.leaders.map((l) => l.key)).toEqual(["points"]);
    });

    it("ignores non-roster players and returns no leader without rows", () => {
        const out = buildLeaders({
            rosterIds: ["a"],
            seasonRows: [row({player_id: "z", sets_played: 9, points_total: 90})],
            careerRows: [],
        });
        expect(out.leaders).toEqual([]);
    });
});
