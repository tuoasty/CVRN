import {describe, expect, it} from "vitest";
import {matchRowHeight} from "../matchRowHeight";

const standard = {width: 1000, height: 1400};

describe("matchRowHeight", () => {
    it("makes six rows reach the bottom of one 260px wide card", () => {
        expect(matchRowHeight([standard])).toBeCloseTo((364 + 12) / 6);
    });

    it("makes six rows reach the bottom of 220px wide cards", () => {
        expect(matchRowHeight([standard, standard])).toBeCloseTo((308 + 12) / 6);
    });

    it("follows the canvas ratio of the first card", () => {
        expect(matchRowHeight([{width: 1000, height: 1000}])).toBeCloseTo((260 + 12) / 6);
    });

    it("uses the one card size when there are no cards", () => {
        expect(matchRowHeight([])).toBeCloseTo((364 + 12) / 6);
    });
});
