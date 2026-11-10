import {describe, expect, it} from "vitest";
import type {SeasonRosterEntry, TeamWithRegion} from "@/server/domains/team/types";
import {buildTeamsGrid} from "../buildTeamsGrid";
import type {RankedValue} from "../strength";

function team(id: string, name: string, o: Partial<TeamWithRegion> = {}): TeamWithRegion {
    return {
        id,
        name,
        slug: name.toLowerCase(),
        logo_url: null,
        logo_bg_removed: false,
        season_id: "s1",
        deleted_at: null,
        created_at: "2026-01-01T00:00:00Z",
        brick_number: 1,
        brick_color: "#FFFFFF",
        starting_lvr: 0,
        starting_points: 0,
        is_bye: false,
        seasons: {
            id: "s1",
            name: "Season 3",
            slug: "season-3",
            max_players: 12,
            regions: {id: "r1", code: "NA", name: "North America"},
        },
        ...o,
    };
}

function roster(teamId: string, displayName: string | null, username: string | null): SeasonRosterEntry {
    return {teamId, playerId: `${teamId}-${username}`, displayName, username, avatarUrl: null, position: null, role: "player"};
}

const teams = [team("a", "Aurora"), team("b", "Blaze"), team("c", "Comets"), team("d", "Drift")];

function strengths(values: Record<string, RankedValue>): Map<string, RankedValue> {
    return new Map(Object.entries(values));
}

const empty: RankedValue = {value: null, rank: null};

describe("buildTeamsGrid", () => {
    it("sorts by strength descending with unrated teams last in name order", () => {
        const out = buildTeamsGrid({
            teams,
            strengths: strengths({
                a: {value: -1, rank: 2},
                b: empty,
                c: {value: 2, rank: 1},
                d: empty,
            }),
            rosters: [],
            sort: "strength",
            query: "",
        });
        expect(out.tiles.map((t) => t.team.id)).toEqual(["c", "a", "b", "d"]);
        expect(out.strengthAvailable).toBe(true);
        expect(out.effectiveSort).toBe("strength");
    });

    it("falls back to A to Z when no team has a strength", () => {
        const out = buildTeamsGrid({
            teams: [teams[2], teams[0], teams[1]],
            strengths: strengths({a: empty, b: empty, c: empty}),
            rosters: [],
            sort: "strength",
            query: "",
        });
        expect(out.strengthAvailable).toBe(false);
        expect(out.effectiveSort).toBe("az");
        expect(out.tiles.map((t) => t.team.id)).toEqual(["a", "b", "c"]);
    });

    it("sorts A to Z when asked even with strengths", () => {
        const out = buildTeamsGrid({
            teams: [teams[2], teams[0]],
            strengths: strengths({a: {value: -1, rank: 2}, c: {value: 2, rank: 1}}),
            rosters: [],
            sort: "az",
            query: "",
        });
        expect(out.tiles.map((t) => t.team.id)).toEqual(["a", "c"]);
        expect(out.effectiveSort).toBe("az");
    });

    it("matches team names, display names and usernames, case-insensitive and trimmed", () => {
        const rosters = [roster("b", "Kevin Spike", "kspike"), roster("c", null, "netwizard")];
        const base = {teams, strengths: strengths({}), rosters, sort: "az" as const};
        expect(buildTeamsGrid({...base, query: "  auro "}).tiles.map((t) => t.team.id)).toEqual(["a"]);
        expect(buildTeamsGrid({...base, query: "SPIKE"}).tiles.map((t) => t.team.id)).toEqual(["b"]);
        expect(buildTeamsGrid({...base, query: "wizard"}).tiles.map((t) => t.team.id)).toEqual(["c"]);
        expect(buildTeamsGrid({...base, query: ""}).tiles).toHaveLength(4);
    });

    it("excludes bye teams", () => {
        const out = buildTeamsGrid({
            teams: [...teams, team("z", "BYE", {is_bye: true})],
            strengths: strengths({}),
            rosters: [],
            sort: "az",
            query: "",
        });
        expect(out.tiles.map((t) => t.team.id)).not.toContain("z");
    });

    it("gives every tile a strength entry", () => {
        const out = buildTeamsGrid({teams: [teams[0]], strengths: strengths({}), rosters: [], sort: "az", query: ""});
        expect(out.tiles[0].strength).toEqual(empty);
    });
});
