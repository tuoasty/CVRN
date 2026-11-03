import {describe, expect, it} from "vitest";
import {isSeasonActiveAt} from "@/server/domains/season/helpers/isSeasonActive";
import {isSeasonEnded} from "../teamHistoryPreview";

const NOW = new Date("2026-11-03T00:00:00.000Z");

describe("season end boundary", () => {
    it("isSeasonActiveAt uses the time it is given", () => {
        expect(isSeasonActiveAt({end_date: "2026-11-02T00:00:00.000Z"}, NOW)).toBe(false);
        expect(isSeasonActiveAt({end_date: "2026-11-04T00:00:00.000Z"}, NOW)).toBe(true);
    });

    it("a season ending at this exact instant counts as ended everywhere", () => {
        const end = "2026-11-03T00:00:00.000Z";
        expect(isSeasonActiveAt({end_date: end}, NOW)).toBe(false);
        expect(isSeasonEnded({season_end_date: end}, NOW)).toBe(true);
    });

    it("a season with no end date is not ended", () => {
        expect(isSeasonEnded({season_end_date: null}, NOW)).toBe(false);
    });
});
