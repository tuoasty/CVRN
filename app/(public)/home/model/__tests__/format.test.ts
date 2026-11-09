import {describe, expect, it} from "vitest";
import {formatRegionDate, formatRegionDay, formatRegionTime, formatWhen} from "../format";

const TZ = "Europe/London";

describe("format", () => {
    it("formats a region time as 24h", () => {
        expect(formatRegionTime("2026-11-12T20:00:00Z", TZ)).toBe("20:00");
    });

    it("formats a short day", () => {
        expect(formatRegionDay("2026-11-11T20:00:00Z", TZ)).toBe("Wed 11");
    });

    it("formats a full date", () => {
        expect(formatRegionDate("2026-11-14T18:00:00Z", TZ)).toBe("Sat 14 Nov");
    });

    it("when label is Today for a match today", () => {
        expect(formatWhen("2026-11-12T20:00:00Z", TZ, new Date("2026-11-12T08:00:00Z"))).toEqual({label: "20:00", isToday: true});
    });

    it("when label carries the date otherwise", () => {
        expect(formatWhen("2026-11-14T18:00:00Z", TZ, new Date("2026-11-12T08:00:00Z"))).toEqual({label: "Sat 14 Nov · 18:00", isToday: false});
    });

    it("when label is Date TBD without a schedule", () => {
        expect(formatWhen(null, TZ, new Date("2026-11-12T08:00:00Z"))).toEqual({label: "Date TBD", isToday: false});
    });
});
