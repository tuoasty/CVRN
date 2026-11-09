import {describe, expect, it} from "vitest";
import {fitThumbs} from "../fitThumbs";

describe("fitThumbs", () => {
    it("fits seven 16:9 thumbnails in the desktop row", () => {
        expect(fitThumbs(Array(20).fill(16 / 9))).toBe(7);
    });

    it("fits sixteen 4:5 thumbnails in the desktop row", () => {
        expect(fitThumbs(Array(30).fill(0.8))).toBe(16);
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
