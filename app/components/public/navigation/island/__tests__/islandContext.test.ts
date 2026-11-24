import {describe, expect, it} from "vitest";
import {contextHref, islandRegionFor, latestSeason, seasonGroupsFor, sortSeasonsNewestFirst} from "../islandContext";

const regions = [
    {id: "r-as", code: "AS", name: "Asia"},
    {id: "r-eu", code: "EU", name: "Europe"},
    {id: "r-na", code: "NA", name: "North America"},
    {id: "r-sa", code: "SA", name: "South America"},
];
const s = (id: string, region_id: string, n: number, start: string, end: string | null = null) =>
    ({id, slug: `s${n}`, name: `Season ${n}`, region_id, start_date: start, end_date: end, season_number: n});

describe("islandRegionFor", () => {
    it("maps island codes case-insensitively", () => {
        expect(islandRegionFor("na")).toBe("NA");
        expect(islandRegionFor("Eu")).toBe("EU");
    });
    it("folds SA under NA", () => {
        expect(islandRegionFor("sa")).toBe("NA");
    });
    it("returns null for unknown or missing codes", () => {
        expect(islandRegionFor("xx")).toBeNull();
        expect(islandRegionFor(undefined)).toBeNull();
    });
});

describe("sortSeasonsNewestFirst", () => {
    it("orders by start_date desc, then season_number desc", () => {
        const out = sortSeasonsNewestFirst([
            s("a", "r-na", 1, "2025-01-01"),
            s("c", "r-na", 3, "2026-01-01"),
            s("b", "r-na", 2, "2026-01-01"),
        ]);
        expect(out.map(x => x.id)).toEqual(["c", "b", "a"]);
    });
});

describe("seasonGroupsFor", () => {
    const seasons = [
        s("na1", "r-na", 1, "2025-01-01", "2025-03-01"),
        s("na2", "r-na", 2, "2026-01-01"),
        s("sa1", "r-sa", 1, "2024-01-01", "2024-03-01"),
        s("eu1", "r-eu", 1, "2025-06-01"),
    ];
    it("puts NA first and SA after it, each newest first", () => {
        const groups = seasonGroupsFor("NA", regions, seasons);
        expect(groups.map(g => g.regionCode)).toEqual(["NA", "SA"]);
        expect(groups[0].regionName).toBe("North America");
        expect(groups[0].seasons.map(x => x.id)).toEqual(["na2", "na1"]);
        expect(groups[1].seasons.map(x => x.id)).toEqual(["sa1"]);
    });
    it("gives other regions only their own group", () => {
        expect(seasonGroupsFor("EU", regions, seasons).map(g => g.regionCode)).toEqual(["EU"]);
    });
    it("drops empty groups", () => {
        expect(seasonGroupsFor("AS", regions, seasons)).toEqual([]);
    });
});

describe("latestSeason", () => {
    const seasons = [s("na1", "r-na", 1, "2025-01-01"), s("sa9", "r-sa", 9, "2027-01-01")];
    it("ignores folded regions", () => {
        expect(latestSeason("NA", regions, seasons)?.id).toBe("na1");
    });
    it("returns null when the region has no seasons", () => {
        expect(latestSeason("AS", regions, seasons)).toBeNull();
    });
});

describe("contextHref", () => {
    const cur = {region: "na", season: "s10"};
    it("keeps the section only", () => {
        expect(contextHref("EU", "s9", "/na/s10/matches/W1-M2/a-vs-b", cur)).toBe("/eu/s9/matches");
        expect(contextHref("EU", "s9", "/na/s10/standings", cur)).toBe("/eu/s9/standings");
    });
    it("goes to the season home from the season home", () => {
        expect(contextHref("AS", "s3", "/na/s10", cur)).toBe("/as/s3");
        expect(contextHref("AS", "s3", "/na/s10/", cur)).toBe("/as/s3");
    });
    it("goes to the season home with no current context", () => {
        expect(contextHref("NA", "s10", "/players", null)).toBe("/na/s10");
    });
});
