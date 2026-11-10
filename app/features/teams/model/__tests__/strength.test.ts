import {describe, expect, it} from "vitest";
import type {TeamStrength} from "@/server/domains/team/types";
import {formatStrength, ordinal, rankValues, seasonStrengths} from "../strength";

describe("rankValues", () => {
    it("shares a rank on ties and skips the next rank", () => {
        const out = rankValues(
            [
                {id: "a", value: 5},
                {id: "b", value: 3},
                {id: "c", value: 3},
                {id: "d", value: 1},
            ],
            "desc",
        );
        expect(["a", "b", "c", "d"].map((id) => out.get(id)?.rank)).toEqual([1, 2, 2, 4]);
    });

    it("leaves null values unranked", () => {
        const out = rankValues([{id: "a", value: 2}, {id: "b", value: null}], "desc");
        expect(out.get("a")).toEqual({value: 2, rank: 1});
        expect(out.get("b")).toEqual({value: null, rank: null});
    });

    it("ranks ascending when asked", () => {
        const out = rankValues([{id: "a", value: 2}, {id: "b", value: 1}], "asc");
        expect(out.get("b")?.rank).toBe(1);
        expect(out.get("a")?.rank).toBe(2);
    });
});

describe("seasonStrengths", () => {
    const rows: TeamStrength[] = [
        {teamId: "a", seasonId: "s1", sets: 10, rating: 1.5},
        {teamId: "b", seasonId: "s1", sets: 10, rating: -0.5},
        {teamId: "c", seasonId: "s2", sets: 10, rating: 9},
    ];

    it("ignores other seasons and fills missing teams with nulls", () => {
        const out = seasonStrengths(rows, "s1", ["a", "b", "c", "d"]);
        expect(out.get("a")).toEqual({value: 1.5, rank: 1});
        expect(out.get("b")).toEqual({value: -0.5, rank: 2});
        expect(out.get("c")).toEqual({value: null, rank: null});
        expect(out.get("d")).toEqual({value: null, rank: null});
        expect(out.size).toBe(4);
    });
});

describe("formatStrength", () => {
    it("signs and rounds to one decimal", () => {
        expect(formatStrength(1.84)).toBe("+1.8");
        expect(formatStrength(-0.44)).toBe("-0.4");
        expect(formatStrength(-0.04)).toBe("0.0");
        expect(formatStrength(0)).toBe("0.0");
        expect(formatStrength(null)).toBe("-");
    });
});

describe("ordinal", () => {
    it("handles the teens and the 1/2/3 endings", () => {
        expect([1, 2, 3, 4, 11, 12, 13, 21, 22].map(ordinal)).toEqual([
            "1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd",
        ]);
    });
});
