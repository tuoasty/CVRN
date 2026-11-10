import {describe, expect, it} from "vitest";
import type {RankedValue} from "@/app/features/teams/model/strength";
import {scheduleStrength} from "../scheduleStrength";

function strengths(values: Record<string, number | null>): Map<string, RankedValue> {
    return new Map(Object.entries(values).map(([id, value]) => [id, {value, rank: null}]));
}

describe("scheduleStrength", () => {
    it("averages opponent strengths and skips opponents without one", () => {
        const out = scheduleStrength({
            matchesByTeam: new Map([
                ["a", ["b", "c", "d"]],
                ["b", ["a", "x"]],
            ]),
            strengths: strengths({a: 0, b: 3, c: 1, d: -1, x: null}),
        });
        expect(out.get("a")?.value).toBeCloseTo(1, 5);
        expect(out.get("b")?.value).toBeCloseTo(0, 5);
    });

    it("is null when no opponent has a strength", () => {
        const out = scheduleStrength({
            matchesByTeam: new Map([["a", ["x", "y"]]]),
            strengths: strengths({a: 1, x: null, y: null}),
        });
        expect(out.get("a")).toEqual({value: null, rank: null});
    });

    it("ranks the highest mean as 1 (hardest)", () => {
        const out = scheduleStrength({
            matchesByTeam: new Map([
                ["a", ["c"]],
                ["b", ["d"]],
                ["c", ["a"]],
            ]),
            strengths: strengths({a: 0, b: 0, c: 2, d: 5}),
        });
        expect(out.get("b")?.rank).toBe(1);
        expect(out.get("a")?.rank).toBe(2);
        expect(out.get("c")?.rank).toBe(3);
    });

    it("counts a repeated opponent once per meeting", () => {
        const out = scheduleStrength({
            matchesByTeam: new Map([["a", ["b", "b", "c"]]]),
            strengths: strengths({a: 0, b: 3, c: 0}),
        });
        expect(out.get("a")?.value).toBeCloseTo(2, 5);
    });
});
