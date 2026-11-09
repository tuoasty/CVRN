import {describe, expect, it} from "vitest";
import {THUMB_HEIGHT, fitThumbs} from "../fitThumbs";

describe("fitThumbs", () => {
    it("fits seven 16:9 thumbnails in the desktop row", () => {
        expect(fitThumbs(Array(20).fill(16 / 9))).toBe(7);
    });

    it("fits fifteen 4:5 thumbnails in the desktop row", () => {
        expect(fitThumbs(Array(30).fill(0.8))).toBe(15);
    });

    it("thumb height is the one where seven 16:9 fill 1376px exactly", () => {
        expect(THUMB_HEIGHT).toBeCloseTo(106.714, 2);
        expect(fitThumbs(Array(7).fill(16 / 9))).toBe(7);
        expect(fitThumbs(Array(8).fill(16 / 9))).toBe(7);
    });

    it("a GFX a few pixels wider than 16:9 does not drop the seventh thumb", () => {
        const ratios = [16 / 9, 16 / 9, 16 / 9, 1.791011235955056, 16 / 9, 16 / 9, 16 / 9, 16 / 9];
        expect(fitThumbs(ratios)).toBe(7);
    });

    it("still stops when the overflow is more than slight", () => {
        expect(fitThumbs([2, 2, 2, 2, 2, 2, 2])).toBe(6);
    });

    it("counts mixed widths greedily in order", () => {
        expect(fitThumbs([16 / 9, 0.8, 16 / 9], 300, 96, 8)).toBe(2);
    });

    it("never returns more than it was given", () => {
        expect(fitThumbs([0.8, 0.8])).toBe(2);
    });

    it("always keeps the first item even when it is wider than the row", () => {
        expect(fitThumbs([20], 300, 96, 8)).toBe(1);
    });
});
