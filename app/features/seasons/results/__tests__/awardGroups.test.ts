import {describe, it, expect} from "vitest";
import {SeasonAwardEntryWithPlayer} from "@/server/domains/season";
import {awardsIn, movability, reorderGroup, rosterRoleLabel, sortRoster} from "../awardGroups";

function award(id: string, over: Partial<SeasonAwardEntryWithPlayer> = {}): SeasonAwardEntryWithPlayer {
    return {
        id,
        season_id: "s1",
        player_id: `p-${id}`,
        award_name: id,
        category: "all_star",
        awarded_at: "",
        created_by: null,
        created_at: "",
        sort_order: 0,
        full_avatar_url: null,
        avatar_bucket_path: null,
        all_star_team: "A",
        all_star_slot: "starter",
        all_star_captain: false,
        players: {id: `p-${id}`, username: id, season_team_name: null},
        ...over,
    };
}

const awards = [
    award("x", {sort_order: 3}),
    award("cap", {sort_order: 5, all_star_captain: true}),
    award("y", {sort_order: 1}),
    award("sub", {sort_order: 0, all_star_slot: "sub"}),
    award("b", {sort_order: 2, all_star_team: "B"}),
];

describe("awardsIn", () => {
    it("filters by team and slot and puts the captain first", () => {
        expect(awardsIn(awards, "all_star", "A", "starter").map(a => a.id)).toEqual(["cap", "y", "x"]);
    });
});

describe("reorderGroup", () => {
    it("swaps sort order with the neighbour inside the same team and slot", () => {
        const x = awards[0];
        expect(reorderGroup(awards, x, "up")).toEqual([{id: "x", sortOrder: 1}, {id: "y", sortOrder: 3}]);
    });

    it("returns null at the edge and for captains", () => {
        expect(reorderGroup(awards, awards[0], "down")).toBeNull();
        expect(reorderGroup(awards, awards[1], "up")).toBeNull();
    });
});

describe("movability", () => {
    it("reports which directions are open", () => {
        expect(movability(awards, awards[2])).toEqual({up: false, down: true});
        expect(movability(awards, awards[0])).toEqual({up: true, down: false});
        expect(movability(awards, awards[1])).toEqual({up: false, down: false});
    });
});

describe("champion roster", () => {
    it("orders captain, vice, court, then the rest", () => {
        const roster = [
            award("m", {category: "champion_roster", award_name: "member", sort_order: 0}),
            award("c", {category: "champion_roster", award_name: "court_captain", sort_order: 1}),
            award("k", {category: "champion_roster", award_name: "captain", sort_order: 2}),
            award("v", {category: "champion_roster", award_name: "vice_captain", sort_order: 3}),
        ];
        expect(sortRoster(roster).map(a => a.id)).toEqual(["k", "v", "c", "m"]);
        expect(rosterRoleLabel("vice_captain")).toBe("Vice");
        expect(rosterRoleLabel("member")).toBe("");
    });
});
