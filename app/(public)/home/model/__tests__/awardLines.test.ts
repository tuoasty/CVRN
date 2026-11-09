import {describe, expect, it} from "vitest";
import {mainPosition, potwLine, roundTeamLeaders, sumPlayerTotals} from "../awardLines";
import {makeTotal} from "./fixtures";

describe("mainPosition", () => {
    it("picks the most played position", () => {
        expect(mainPosition({OUT: 3, SET: 9, LIB: 1})).toBe("SET");
    });

    it("null for missing or empty counts", () => {
        expect(mainPosition(null)).toBeNull();
        expect(mainPosition({})).toBeNull();
    });
});

describe("sumPlayerTotals", () => {
    it("sums counts and recomputes percentages from the raw counts", () => {
        const rows = [
            makeTotal({player_id: "p", total_kills: 10, spiking_errors: 2, total_attempts: 20, assists: 30, setting_errors: 0, kill_blocks: 1, total_blocks: 4}),
            makeTotal({player_id: "p", total_kills: 5, spiking_errors: 1, total_attempts: 10, assists: 10, setting_errors: 10, kill_blocks: 1, total_blocks: 0}),
            makeTotal({player_id: "q", total_kills: 99}),
        ];
        const out = sumPlayerTotals(rows, "p");
        expect(out?.total_kills).toBe(15);
        expect(out?.hit_eff).toBeCloseTo(12 / 30);
        expect(out?.set_eff).toBeCloseTo(40 / 50);
        expect(out?.kb_pct).toBeCloseTo(2 / 4);
    });

    it("null when the player has no rows", () => {
        expect(sumPlayerTotals([makeTotal({player_id: "q"})], "p")).toBeNull();
    });
});

describe("potwLine", () => {
    it("setter season line is per set", () => {
        const line = potwLine("SET", {assists_per_set: 9.04, set_eff: 0.9, points_per_set: 2, ape_kills_per_set: 0.5, hit_eff: 0.25, receives_per_set: 1, blocks_per_set: 0.2, aces_per_set: 0.1}, "season");
        expect(line.map(c => c.label)).toEqual(["AST/set", "SET%", "PTS/set", "APEK/set", "HIT%", "REC/set", "BLK/set", "ACE/set"]);
        expect(line[0].value).toBe("9.0");
        expect(line[1].value).toBe("90.0%");
    });

    it("libero week line is totals", () => {
        const line = potwLine("LIB", {total_receives: 30, digs: 12, dives: 4, block_touches: 2, assists: 3}, "match");
        expect(line).toEqual([
            {label: "REC", value: "30"},
            {label: "DIG", value: "12"},
            {label: "DIV", value: "4"},
            {label: "BT", value: "2"},
            {label: "AST", value: "3"},
        ]);
    });

    it("each position has its own stat set", () => {
        expect(potwLine("OPP", {}, "match").map(c => c.label)).toEqual(["PTS", "K", "HIT%", "DLK", "QK", "REC", "BLK", "ACE"]);
        expect(potwLine("OUT", {}, "match").map(c => c.label)).toEqual(["PTS", "K", "HIT%", "REC", "DIG", "BLK", "ACE"]);
        expect(potwLine("MID", {}, "match").map(c => c.label)).toEqual(["PTS", "K", "HIT%", "KB", "BLK", "KB%", "REC", "ACE"]);
    });

    it("unknown position falls back to the outside set", () => {
        expect(potwLine(null, {}, "match").map(c => c.label)).toEqual(["PTS", "K", "HIT%", "REC", "DIG", "BLK", "ACE"]);
    });
});

describe("roundTeamLeaders", () => {
    it("sums each player's round totals before picking the leader", () => {
        const rows = [
            makeTotal({player_id: "a", team_id: "t", match_id: "m1", points: 10}),
            makeTotal({player_id: "a", team_id: "t", match_id: "m2", points: 10}),
            makeTotal({player_id: "b", team_id: "t", match_id: "m1", points: 15}),
            makeTotal({player_id: "c", team_id: "other", match_id: "m1", points: 40}),
        ];
        const leaders = roundTeamLeaders(rows, "t");
        expect(leaders.scorer).toMatchObject({playerId: "a", value: 20});
        expect(leaders.scorer?.row.points).toBe(20);
    });

    it("null for a category nobody recorded", () => {
        expect(roundTeamLeaders([makeTotal({player_id: "a", team_id: "t"})], "t").blocker).toBeNull();
    });
});
