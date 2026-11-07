import {describe, expect, it} from "vitest";
import {headerSeasonNumber, pickRegionTargets, resolveContinue, type RegionTargets} from "../landingData";

const NOW = new Date("2026-11-06T12:00:00Z");

const REGIONS = [
    {id: "r-as", code: "AS", name: "Asia"},
    {id: "r-eu", code: "EU", name: "Europe"},
    {id: "r-na", code: "NA", name: "North America"},
    {id: "r-sa", code: "SA", name: "South America"},
];

function season(region_id: string, n: number, start_date: string, end_date: string | null) {
    return {region_id, slug: `season-${n}`, name: `Season ${n}`, season_number: n, start_date, end_date};
}

describe("pickRegionTargets", () => {
    it("prefers the newest season that has not ended", () => {
        const targets = pickRegionTargets(REGIONS, [
            season("r-as", 2, "2026-05-01", "2026-08-01"),
            season("r-as", 3, "2026-09-01", null),
        ], NOW);
        expect(targets.as).toEqual({href: "/as/season-3", seasonNumber: 3});
    });

    it("falls back to the newest ended season when none is active", () => {
        const targets = pickRegionTargets(REGIONS, [
            season("r-eu", 1, "2025-12-01", "2026-03-01"),
            season("r-eu", 2, "2026-05-01", "2026-08-01"),
        ], NOW);
        expect(targets.eu).toEqual({href: "/eu/season-2", seasonNumber: 2});
    });

    it("treats a future end_date as active", () => {
        const targets = pickRegionTargets(REGIONS, [
            season("r-na", 2, "2026-04-01", "2026-07-01"),
            season("r-na", 3, "2026-09-01", "2026-12-31"),
        ], NOW);
        expect(targets.na).toEqual({href: "/na/season-3", seasonNumber: 3});
    });

    it("links to /select with no season when the region has no seasons", () => {
        const targets = pickRegionTargets(REGIONS, [season("r-as", 3, "2026-09-01", null)], NOW);
        expect(targets.eu).toEqual({href: "/select", seasonNumber: null});
    });

    it("links every region to /select when regions and seasons are empty", () => {
        const targets = pickRegionTargets([], [], NOW);
        expect(targets).toEqual({
            eu: {href: "/select", seasonNumber: null},
            as: {href: "/select", seasonNumber: null},
            na: {href: "/select", seasonNumber: null},
        });
    });
});

describe("resolveContinue", () => {
    const seasons = [
        {region_id: "r-as", slug: "season-3", name: "Season 3"},
        {region_id: "r-sa", slug: "season-2", name: "Season 2"},
    ];

    it("returns null for an undefined cookie", () => {
        expect(resolveContinue(undefined, REGIONS, seasons)).toBeNull();
    });

    it("returns null for a value without a colon", () => {
        expect(resolveContinue("as", REGIONS, seasons)).toBeNull();
    });

    it("returns null when the season slug no longer exists", () => {
        expect(resolveContinue("as:season-9", REGIONS, seasons)).toBeNull();
    });

    it("builds href and label from the representative name", () => {
        expect(resolveContinue("as:season-3", REGIONS, seasons)).toEqual({
            href: "/as/season-3",
            label: "Asia Season 3",
        });
    });

    it("falls back to the region's own name outside the three representatives", () => {
        expect(resolveContinue("sa:season-2", REGIONS, seasons)).toEqual({
            href: "/sa/season-2",
            label: "South America Season 2",
        });
    });
});

describe("headerSeasonNumber", () => {
    const targets: RegionTargets = {
        as: {href: "/as/season-3", seasonNumber: 3},
        eu: {href: "/eu/season-2", seasonNumber: 2},
        na: {href: "/na/season-3", seasonNumber: 3},
    };

    it("returns the focused region's number", () => {
        expect(headerSeasonNumber(targets, "eu")).toBe(2);
    });

    it("returns the highest number when nothing is focused", () => {
        expect(headerSeasonNumber(targets, null)).toBe(3);
    });

    it("returns the highest number when the focused region has none", () => {
        expect(headerSeasonNumber({...targets, eu: {href: "/select", seasonNumber: null}}, "eu")).toBe(3);
    });

    it("returns null when no region has a number", () => {
        const empty: RegionTargets = {
            as: {href: "/select", seasonNumber: null},
            eu: {href: "/select", seasonNumber: null},
            na: {href: "/select", seasonNumber: null},
        };
        expect(headerSeasonNumber(empty, null)).toBeNull();
    });
});
