import {describe, expect, it} from "vitest";
import {differentialBonus} from "../matchScoring";

describe("differentialBonus", () => {
    it("pays nothing under a 5 point margin", () => {
        expect(differentialBonus(4)).toBe(0);
    });

    it("pays each tier from its threshold", () => {
        expect(differentialBonus(5)).toBe(0.5);
        expect(differentialBonus(10)).toBe(1);
        expect(differentialBonus(19)).toBe(2);
        expect(differentialBonus(20)).toBe(3);
        expect(differentialBonus(25)).toBe(4);
        expect(differentialBonus(30)).toBe(5);
        expect(differentialBonus(48)).toBe(5);
    });
});
