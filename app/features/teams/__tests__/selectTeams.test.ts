import { describe, expect, it } from "vitest";
import { TeamWithRegion } from "@/server/domains/team";
import { SeasonWithPlayoffConfig } from "@/server/domains/season";
import { selectTeams, TeamsFilters } from "../selectTeams";

const FUTURE = "2099-01-01T00:00:00Z";
const PAST = "2020-01-01T00:00:00Z";

function season(
    id: string,
    slug: string,
    regionId: string,
    endDate: string | null
): SeasonWithPlayoffConfig {
    return { id, slug, region_id: regionId, end_date: endDate } as SeasonWithPlayoffConfig;
}

function team(
    id: string,
    name: string,
    seasonId: string,
    seasonSlug: string,
    regionCode: string
): TeamWithRegion {
    return {
        id,
        name,
        slug: name.toLowerCase(),
        season_id: seasonId,
        seasons: {
            id: seasonId,
            name: seasonSlug,
            slug: seasonSlug,
            max_players: 18,
            regions: { id: `region-${regionCode}`, code: regionCode, name: regionCode },
        },
    } as TeamWithRegion;
}

const seasons = [
    season("as-2", "season-2", "region-AS", FUTURE), // active
    season("as-1", "season-1", "region-AS", PAST), // concluded
    season("eu-2", "season-2", "region-EU", FUTURE), // active
    season("eu-1", "season-1", "region-EU", PAST), // concluded
];

const teams = [
    team("t1", "Dragons", "as-2", "season-2", "AS"),
    team("t2", "Tigers", "as-1", "season-1", "AS"),
    team("t3", "Falcons", "eu-2", "season-2", "EU"),
    team("t4", "Wolves", "eu-1", "season-1", "EU"),
];

const run = (filters: Partial<TeamsFilters>) =>
    selectTeams({
        teams,
        seasons,
        filters: { region: "all", season: "active", q: "", ...filters },
    }).map((t) => t.id);

describe("selectTeams", () => {
    it("defaults to active seasons across every region", () => {
        expect(run({})).toEqual(["t1", "t3"]);
    });

    it("returns concluded seasons across every region", () => {
        expect(run({ season: "inactive" })).toEqual(["t2", "t4"]);
    });

    it("narrows to one region while keeping the active-season rule", () => {
        expect(run({ region: "as" })).toEqual(["t1"]);
    });

    it("narrows to one region's concluded seasons", () => {
        expect(run({ region: "eu", season: "inactive" })).toEqual(["t4"]);
    });

    it("resolves a season slug within the selected region only", () => {
        // Both regions have a `season-1`; the region filter disambiguates.
        expect(run({ region: "as", season: "season-1" })).toEqual(["t2"]);
        expect(run({ region: "eu", season: "season-1" })).toEqual(["t4"]);
    });

    it("matches the search query against team name, case-insensitively", () => {
        expect(run({ q: "drag" })).toEqual(["t1"]);
        expect(run({ q: "DRAG" })).toEqual(["t1"]);
        expect(run({ q: "  drag  " })).toEqual(["t1"]);
    });

    it("does not match region or season names via the search query", () => {
        // `eu` would previously have matched every EU team through the region code.
        expect(run({ q: "eu" })).toEqual([]);
        expect(run({ q: "season-2" })).toEqual([]);
    });

    it("combines region, season, and query", () => {
        expect(run({ region: "as", season: "inactive", q: "tig" })).toEqual(["t2"]);
        expect(run({ region: "as", season: "inactive", q: "wolv" })).toEqual([]);
    });

    it("treats a season with no end_date as active", () => {
        const openEnded = [season("na-1", "season-1", "region-NA", null)];
        const naTeam = [team("t5", "Bears", "na-1", "season-1", "NA")];
        const result = selectTeams({
            teams: naTeam,
            seasons: openEnded,
            filters: { region: "all", season: "active", q: "" },
        });
        expect(result.map((t) => t.id)).toEqual(["t5"]);
    });

    it("drops rows missing the region or season join", () => {
        const orphan = { ...teams[0], id: "orphan", seasons: undefined } as unknown as TeamWithRegion;
        const result = selectTeams({
            teams: [...teams, orphan],
            seasons,
            filters: { region: "all", season: "active", q: "" },
        });
        expect(result.map((t) => t.id)).not.toContain("orphan");
    });
});
