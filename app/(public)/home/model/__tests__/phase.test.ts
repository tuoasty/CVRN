import {describe, expect, it} from "vitest";
import {getSeasonPhase, isRegionToday, regionDayKey} from "../phase";
import {postRatio} from "../ratio";

describe("getSeasonPhase", () => {
    it("completed when end_date is in the past", () => {
        expect(getSeasonPhase({end_date: "2026-11-01T00:00:00Z", playoff_started: true}, new Date("2026-11-09T00:00:00Z"))).toBe("completed");
    });

    it("playoffs when started and not ended", () => {
        expect(getSeasonPhase({end_date: null, playoff_started: true}, new Date("2026-11-09T00:00:00Z"))).toBe("playoffs");
    });

    it("regular otherwise", () => {
        expect(getSeasonPhase({end_date: "2027-01-01T00:00:00Z", playoff_started: false}, new Date("2026-11-09T00:00:00Z"))).toBe("regular");
    });
});

describe("region day", () => {
    it("keys a day in the region's timezone", () => {
        expect(regionDayKey("2026-11-12T17:00:00Z", "Asia/Singapore")).toBe("2026-11-13");
    });

    it("uses the region day, not UTC", () => {
        expect(isRegionToday("2026-11-12T17:00:00Z", "Asia/Singapore", new Date("2026-11-13T02:00:00Z"))).toBe(true);
        expect(isRegionToday("2026-11-12T17:00:00Z", "UTC", new Date("2026-11-13T02:00:00Z"))).toBe(false);
    });

    it("null schedule is never today", () => {
        expect(isRegionToday(null, "Europe/London", new Date("2026-11-13T02:00:00Z"))).toBe(false);
    });
});

describe("postRatio", () => {
    it("falls back to 16:9 when a dimension is missing", () => {
        expect(postRatio({image_width: null, image_height: 1350})).toBeCloseTo(16 / 9);
    });

    it("uses stored dimensions", () => {
        expect(postRatio({image_width: 1080, image_height: 1350})).toBeCloseTo(0.8);
    });
});
