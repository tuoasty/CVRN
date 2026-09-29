import {describe, it, expect} from "vitest";
import {topPositions, formatPositions, positionsTitle} from "../formatPositions";

describe("topPositions", () => {
    it("orders by set count descending", () => {
        expect(topPositions({OPP: 5, OUT: 30, MID: 12})).toEqual(["OUT", "MID"]);
    });

    it("caps at the top 2 by default", () => {
        expect(topPositions({OUT: 30, OPP: 25, MID: 20, SET: 5})).toEqual(["OUT", "OPP"]);
    });

    it("breaks ties by canonical position order (OUT OPP MID SET LIB)", () => {
        expect(topPositions({SET: 10, OPP: 10, LIB: 10})).toEqual(["OPP", "SET"]);
    });

    it("ignores zero and negative counts", () => {
        expect(topPositions({OUT: 0, MID: 4})).toEqual(["MID"]);
    });

    it("returns empty for null or empty counts", () => {
        expect(topPositions(null)).toEqual([]);
        expect(topPositions(undefined)).toEqual([]);
        expect(topPositions({})).toEqual([]);
    });

    it("honors a custom limit", () => {
        expect(topPositions({OUT: 30, OPP: 25, MID: 20}, 3)).toEqual(["OUT", "OPP", "MID"]);
    });
});

describe("formatPositions", () => {
    it("joins the top two with a slash", () => {
        expect(formatPositions({OUT: 30, OPP: 25})).toBe("OUT/OPP");
    });

    it("shows a single code when only one position was played", () => {
        expect(formatPositions({LIB: 18})).toBe("LIB");
    });

    it("renders an em-dash-free placeholder when there are no positions", () => {
        expect(formatPositions(null)).toBe("—");
        expect(formatPositions({})).toBe("—");
    });
});

describe("positionsTitle", () => {
    it("maps the top codes to full labels", () => {
        expect(positionsTitle({OUT: 30, OPP: 25})).toBe("Outside Hitter, Opposite");
    });

    it("is empty when there are no positions", () => {
        expect(positionsTitle(null)).toBe("");
    });
});
