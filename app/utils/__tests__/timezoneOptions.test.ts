import {describe, expect, it} from "vitest";
import {formatDateInTimezone, getRegionTimezone, getTimezoneOffset} from "../timezoneOptions";

const JULY = new Date("2026-07-15T12:00:00Z");   
const JANUARY = new Date("2026-01-15T12:00:00Z"); 

describe("getTimezoneOffset", () => {
    it("reports GMT+1 for the EU region in summer (BST)", () => {
        expect(getTimezoneOffset("Europe/London", JULY)).toBe("GMT+1");
    });

    it("reports GMT+0 for the EU region in winter", () => {
        expect(getTimezoneOffset("Europe/London", JANUARY)).toBe("GMT+0");
    });

    it("shifts New York across DST", () => {
        expect(getTimezoneOffset("America/New_York", JULY)).toBe("GMT-4");
        expect(getTimezoneOffset("America/New_York", JANUARY)).toBe("GMT-5");
    });

    it("leaves zones without DST unchanged year-round", () => {
        expect(getTimezoneOffset("Asia/Singapore", JULY)).toBe("GMT+8");
        expect(getTimezoneOffset("Asia/Singapore", JANUARY)).toBe("GMT+8");
    });

    it("normalizes the bare 'GMT' that UTC reports", () => {
        expect(getTimezoneOffset("UTC", JULY)).toBe("GMT+0");
    });

    it("keeps minutes for fractional offsets", () => {
        expect(getTimezoneOffset("Asia/Kolkata", JULY)).toBe("GMT+5:30");
    });

    it("falls back to GMT+0 for an invalid zone", () => {
        expect(getTimezoneOffset("Not/AZone", JULY)).toBe("GMT+0");
    });
});

describe("formatDateInTimezone", () => {
    it("labels a summer EU match GMT+1 and shifts the clock", () => {

        const out = formatDateInTimezone("2026-07-15T19:00:00Z", getRegionTimezone("eu"));
        expect(out).toContain("20:00");
        expect(out).toContain("GMT+1");
    });

    it("labels a winter EU match GMT+0 even though it renders today", () => {
        const out = formatDateInTimezone("2026-01-15T19:00:00Z", getRegionTimezone("eu"));
        expect(out).toContain("19:00");
        expect(out).toContain("GMT+0");
    });

    it("returns a placeholder for a missing schedule", () => {
        expect(formatDateInTimezone(null, "Europe/London")).toBe("Time TBD");
    });
});
