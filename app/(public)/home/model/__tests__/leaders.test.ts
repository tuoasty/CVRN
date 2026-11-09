import {describe, expect, it} from "vitest";
import {matchupLine, pickMatchLeader, pickTeamLeader, topSeasonLeaders} from "../leaders";
import {AWAY, HOME, makeLeaderRow, makeTotal} from "./fixtures";

describe("pickTeamLeader", () => {
    it("gate drops a player with under half the team's top sets", () => {
        const a = makeLeaderRow({player_id: "a", sets_played: 2, points_per_set: 30});
        const b = makeLeaderRow({player_id: "b", sets_played: 10, points_per_set: 15});
        expect(pickTeamLeader([a, b], HOME, "scorer")).toEqual({playerId: "b", value: 15});
    });

    it("ignores rows with null team_id", () => {
        const stray = makeLeaderRow({player_id: "s", team_id: null, assists_per_set: 50});
        const real = makeLeaderRow({player_id: "r", assists_per_set: 9});
        expect(pickTeamLeader([stray, real], HOME, "setter")).toEqual({playerId: "r", value: 9});
    });

    it("only considers the requested team", () => {
        const other = makeLeaderRow({player_id: "o", team_id: AWAY, blocks_per_set: 5});
        expect(pickTeamLeader([other], HOME, "blocker")).toBeNull();
    });

    it("null when best value is 0", () => {
        expect(pickTeamLeader([makeLeaderRow({receives_per_set: 0})], HOME, "receiver")).toBeNull();
    });
});

describe("pickMatchLeader", () => {
    it("picks the top value within a team", () => {
        const rows = [
            makeTotal({player_id: "x", team_id: HOME, total_blocks: 4}),
            makeTotal({player_id: "y", team_id: HOME, total_blocks: 6}),
            makeTotal({player_id: "z", team_id: AWAY, total_blocks: 9}),
        ];
        expect(pickMatchLeader(rows, HOME, "blocker")).toEqual({playerId: "y", value: 6});
    });

    it("null team means across both teams", () => {
        const rows = [
            makeTotal({player_id: "x", team_id: HOME, points: 20}),
            makeTotal({player_id: "z", team_id: AWAY, points: 27}),
        ];
        expect(pickMatchLeader(rows, null, "points")).toEqual({playerId: "z", value: 27});
    });
});

describe("topSeasonLeaders", () => {
    it("returns [] with no stats", () => {
        expect(topSeasonLeaders([makeLeaderRow(), makeLeaderRow()])).toEqual([]);
    });

    it("top 3 per category in Points, Assists, Blocks, Receives order", () => {
        const rows = [10, 40, 30, 20].map((points, i) => makeLeaderRow({player_id: `p${i}`, points_total: points, assists_total: points / 10}));
        const out = topSeasonLeaders(rows);
        expect(out.map(c => c.label)).toEqual(["Points", "Assists", "Blocks", "Receives"]);
        expect(out[0].entries.map(e => e.playerId)).toEqual(["p1", "p2", "p3"]);
        expect(out[0].entries[0].value).toBe(40);
    });
});

describe("matchupLine", () => {
    it("season lines are per set with percentages", () => {
        expect(matchupLine("setter", {assists_per_set: 8.26, set_eff: 0.4214, ape_kills_per_set: 0.4}, "season")).toEqual([
            {label: "AST/set", value: "8.3"},
            {label: "SET%", value: "42.1%"},
            {label: "APK/set", value: "0.4"},
        ]);
    });

    it("match lines are totals and show a dash for missing percentages", () => {
        expect(matchupLine("blocker", {total_blocks: 9, kill_blocks: 4, kb_pct: null}, "match")).toEqual([
            {label: "BLK", value: "9"},
            {label: "KB", value: "4"},
            {label: "KB%", value: "-"},
        ]);
    });

    it("scorer and receiver use their own columns", () => {
        expect(matchupLine("scorer", {points: 27, total_kills: 20, hit_eff: 0.35}, "match").map(c => c.label)).toEqual(["PTS", "K", "HIT%"]);
        expect(matchupLine("receiver", {receives_per_set: 3, digs_per_set: 1.25, dives_per_set: 0}, "season").map(c => c.value)).toEqual(["3.0", "1.3", "0.0"]);
    });
});
