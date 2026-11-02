import {describe, expect, it} from "vitest";
import {pickDashboardSeasons} from "../pickDashboardSeasons";

const region = (code: string) => ({id: `r-${code}`, code});
const active = (regionCode: string, id: string, start_date = "2026-11-02") => ({
    id,
    region_id: `r-${regionCode}`,
    start_date,
    end_date: null as string | null,
});

describe("pickDashboardSeasons", () => {
    it("orders columns AS, NA, EU, SA", () => {
        const regions = [region("AS"), region("EU"), region("NA"), region("SA")];
        const seasons = [active("SA", "sa"), active("EU", "eu"), active("NA", "na"), active("AS", "as")];
        expect(pickDashboardSeasons(regions, seasons).map(c => c.region.code)).toEqual(["AS", "NA", "EU", "SA"]);
    });

    it("matches region codes regardless of case", () => {
        const regions = [region("eu"), region("as")];
        const seasons = [active("eu", "eu"), active("as", "as")];
        expect(pickDashboardSeasons(regions, seasons).map(c => c.region.code)).toEqual(["as", "eu"]);
    });

    it("skips regions with no active season", () => {
        const ended = {...active("EU", "eu"), end_date: "2020-01-01"};
        const regions = [region("AS"), region("EU"), region("SA")];
        expect(pickDashboardSeasons(regions, [active("AS", "as"), ended]).map(c => c.season.id)).toEqual(["as"]);
    });

    it("uses the latest start_date when a region has two active seasons", () => {
        const seasons = [active("NA", "side", "2026-11-09"), active("NA", "main", "2026-11-02")];
        expect(pickDashboardSeasons([region("NA")], seasons).map(c => c.season.id)).toEqual(["side"]);
        expect(pickDashboardSeasons([region("NA")], [...seasons].reverse()).map(c => c.season.id)).toEqual(["side"]);
    });

    it("sorts an unlisted region after the known four", () => {
        const regions = [region("OC"), region("SA")];
        const seasons = [active("OC", "oc"), active("SA", "sa")];
        expect(pickDashboardSeasons(regions, seasons).map(c => c.region.code)).toEqual(["SA", "OC"]);
    });

    it("returns nothing when no season is active", () => {
        expect(pickDashboardSeasons([region("AS")], [])).toEqual([]);
    });
});
