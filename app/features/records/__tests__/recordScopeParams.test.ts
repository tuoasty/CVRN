import {describe, expect, it} from "vitest";
import {buildRecordsHref, buildSeasonOptions, nextScopeForRegion, seasonsForRegion} from "../recordScopeParams";

const regions = [
    {id: "r-as", code: "AS"},
    {id: "r-na", code: "NA"},
    {id: "r-eu", code: "EU"},
];

const seasons = [
    {region_id: "r-as", season_number: 1},
    {region_id: "r-na", season_number: 1},
    {region_id: "r-as", season_number: 2},
    {region_id: "r-na", season_number: 2},
    {region_id: "r-eu", season_number: 2},
    {region_id: "r-na", season_number: 3},
];

const options = buildSeasonOptions(seasons, regions);

describe("buildSeasonOptions", () => {
    it("groups seasons by number, newest first, with their regions", () => {
        expect(options).toEqual([
            {number: 3, regionCodes: ["NA"]},
            {number: 2, regionCodes: ["AS", "EU", "NA"]},
            {number: 1, regionCodes: ["AS", "NA"]},
        ]);
    });
});

describe("seasonsForRegion", () => {
    it("keeps every season when no region is picked", () => {
        expect(seasonsForRegion(options, null)).toHaveLength(3);
    });

    it("keeps only the seasons that region has", () => {
        expect(seasonsForRegion(options, "as").map(o => o.number)).toEqual([2, 1]);
    });
});

describe("nextScopeForRegion", () => {
    it("keeps the season when the new region has it", () => {
        expect(nextScopeForRegion(options, "eu", 2)).toEqual({region: "eu", season: 2});
    });

    it("drops the season when the new region does not have it", () => {
        expect(nextScopeForRegion(options, "as", 3)).toEqual({region: "as", season: null});
    });

    it("keeps the season when switching back to all regions", () => {
        expect(nextScopeForRegion(options, null, 3)).toEqual({region: null, season: 3});
    });
});

describe("buildRecordsHref", () => {
    it("builds all four scope shapes", () => {
        expect(buildRecordsHref(null, null)).toBe("/records");
        expect(buildRecordsHref("na", null)).toBe("/records?region=NA");
        expect(buildRecordsHref(null, 2)).toBe("/records?season=2");
        expect(buildRecordsHref("na", 2)).toBe("/records?region=NA&season=2");
    });
});
