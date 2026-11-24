import {describe, expect, it} from "vitest";
import {contextHref, islandRegionFor, isPlainLeftClick, seasonForRegionSwitch, seasonGroupsFor, sortSeasonsNewestFirst} from "../islandContext";

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

describe("isPlainLeftClick", () => {
    const click = {button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false};
    it("accepts an unmodified left click", () => {
        expect(isPlainLeftClick(click)).toBe(true);
    });
    it("rejects clicks that open a new tab or window", () => {
        expect(isPlainLeftClick({...click, ctrlKey: true})).toBe(false);
        expect(isPlainLeftClick({...click, metaKey: true})).toBe(false);
        expect(isPlainLeftClick({...click, shiftKey: true})).toBe(false);
        expect(isPlainLeftClick({...click, altKey: true})).toBe(false);
        expect(isPlainLeftClick({...click, button: 1})).toBe(false);
    });
});

describe("seasonForRegionSwitch", () => {
    const seasons = [
        s("na1", "r-na", 1, "2025-01-01"),
        s("na2", "r-na", 2, "2025-06-01"),
        s("na3", "r-na", 3, "2026-01-01"),
        s("sa2", "r-sa", 2, "2025-06-01"),
        s("as1", "r-as", 1, "2025-01-01"),
    ];
    it("keeps the season number when the region has it", () => {
        expect(seasonForRegionSwitch("NA", regions, seasons, 2)?.id).toBe("na2");
    });
    it("falls back to the newest season when the region lacks that number", () => {
        expect(seasonForRegionSwitch("AS", regions, seasons, 3)?.id).toBe("as1");
    });
    it("falls back to the newest season with no current season number", () => {
        expect(seasonForRegionSwitch("NA", regions, seasons, null)?.id).toBe("na3");
    });
    it("never picks a folded region's season", () => {
        const noNa2 = seasons.filter(x => x.id !== "na2");
        expect(seasonForRegionSwitch("NA", regions, noNa2, 2)?.id).toBe("na3");
    });
    it("returns null when the region has no seasons", () => {
        expect(seasonForRegionSwitch("EU", regions, seasons, 1)).toBeNull();
    });
});
