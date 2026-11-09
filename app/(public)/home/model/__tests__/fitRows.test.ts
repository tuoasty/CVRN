import {describe, expect, it} from "vitest";
import {fitRows} from "../fitThumbs";

describe("fitRows", () => {
    it("fills three rows of 16:9 tiles at 190px in 1376px", () => {
        const ratios = Array.from({length: 30}, () => 16 / 9);
        expect(fitRows(ratios, 3, 1376, 190, 8)).toBe(12);
    });

    it("packs narrower tiles more per row", () => {
        const ratios = Array.from({length: 40}, () => 0.8);
        expect(fitRows(ratios, 3, 1376, 190, 8)).toBe(24);
    });

    it("breaks rows the way flex-wrap does with mixed ratios", () => {
        expect(fitRows([3, 3, 3, 3, 1], 1, 1000, 100, 10)).toBe(3);
        expect(fitRows([3, 3, 3, 1, 1, 1, 9], 2, 1000, 100, 10)).toBe(6);
    });

    it("an item wider than the row sits alone", () => {
        expect(fitRows([20, 1, 20, 1], 2, 1000, 100, 10)).toBe(2);
    });

    it("returns everything when there aren't enough tiles", () => {
        expect(fitRows([1, 1], 3, 1376, 190, 8)).toBe(2);
    });
});
