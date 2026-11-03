import {describe, expect, it} from "vitest";
import type {PlayerAward, PlayerSpecEntry} from "@/server/domains/player";
import {buildPlayerHonours} from "../playerHonours";

let nextId = 0;

function award(category: string, awardName: string, patch: Partial<PlayerAward> = {}): PlayerAward {
    nextId += 1;
    return {
        id: `award-${nextId}`,
        award_name: awardName,
        category,
        season_id: "s",
        season_name: "Season 2",
        season_slug: "season-2",
        region_code: "EU",
        team_name: null,
        team_slug: null,
        team_disbanded: false,
        awarded_at: null,
        team_logo_url: null,
        team_logo_bg_removed: false,
        season_start_date: "2026-01-01",
        ...patch,
    };
}

function spec(specName: string): PlayerSpecEntry {
    nextId += 1;
    return {
        id: `spec-${nextId}`,
        spec_name: specName,
        position: "OH",
        stars: 5,
        stars_awarded: 5,
        dropped: false,
        season_id: "s",
        season_name: "Season 2",
        season_slug: "season-2",
        region_code: "EU",
        awarded_at: null,
        season_start_date: "2026-01-01",
        team_name: null,
        team_slug: null,
        team_disbanded: false,
        team_logo_url: null,
        team_logo_bg_removed: false,
    };
}

describe("buildPlayerHonours", () => {
    it("counts champion rows with different roles as one label", () => {
        const honours = buildPlayerHonours([award("champion_roster", "Captain"), award("champion_roster", "Setter")], []);
        expect(honours).toEqual([{label: "Champion", count: 2}]);
    });

    it("orders podium, individual, all-star, first team, then specs", () => {
        const honours = buildPlayerHonours(
            [
                award("first_team", "Setter"),
                award("all_star", "Setter"),
                award("individual_winners", "Best Setter"),
                award("third_place", "Third"),
                award("runner_up", "Runner"),
                award("champion_roster", "Captain"),
            ],
            [spec("Quick Hands")],
        );
        expect(honours.map(h => h.label)).toEqual([
            "Champion",
            "Runner Up",
            "Third Place",
            "Best Setter",
            "All-Star",
            "First Team Setter",
            "Quick Hands",
        ]);
    });

    it("sorts individual awards by count, then name", () => {
        const honours = buildPlayerHonours(
            [
                award("individual_winners", "Finals MVP"),
                award("individual_winners", "Best Setter"),
                award("individual_winners", "Most Valuable Player"),
                award("individual_winners", "Most Valuable Player"),
            ],
            [],
        );
        expect(honours).toEqual([
            {label: "Most Valuable Player", count: 2},
            {label: "Best Setter", count: 1},
            {label: "Finals MVP", count: 1},
        ]);
    });

    it("labels placements with their range, best first", () => {
        const honours = buildPlayerHonours(
            [
                award("placement", "", {place: 9, place_end: 12}),
                award("placement", "", {place: 5, place_end: 8}),
                award("placement", "", {place: 5, place_end: 8}),
            ],
            [],
        );
        expect(honours).toEqual([
            {label: "5th–8th", count: 2},
            {label: "9th–12th", count: 1},
        ]);
    });

    it("keeps all-star captain separate from all-star", () => {
        const honours = buildPlayerHonours(
            [award("all_star", "Setter", {all_star_captain: true}), award("all_star", "Setter")],
            [],
        );
        expect(honours.map(h => h.label).sort()).toEqual(["All-Star", "All-Star Captain"]);
    });

    it("ignores staff team awards", () => {
        expect(buildPlayerHonours([award("staff_team", "Commissioner")], [])).toEqual([]);
    });

    it("returns nothing for empty input", () => {
        expect(buildPlayerHonours([], [])).toEqual([]);
    });
});
