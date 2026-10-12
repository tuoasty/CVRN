import {describe, it, expect} from "vitest";
import {toSeasonAwardEntries} from "../toSeasonAwardEntry";

const base = {
    id: "a1",
    season_id: "s1",
    player_id: "p1",
    award_name: "MVP",
    category: "individual_winners",
    awarded_at: "",
    created_by: null,
    created_at: "",
    sort_order: 0,
    full_avatar_url: null,
    avatar_bucket_path: null,
    all_star_team: null,
    all_star_slot: null,
    all_star_captain: false,
};

describe("toSeasonAwardEntries", () => {
    it("lifts the season team name onto the player", () => {
        const [entry] = toSeasonAwardEntries([{...base, players: {id: "p1", username: "kairo", player_team_seasons: [{season_id: "s1", teams: {name: "Kingsguard"}}]}}]);
        expect(entry.players).toEqual({id: "p1", username: "kairo", season_team_name: "Kingsguard"});
    });

    it("ignores other seasons and missing rosters", () => {
        const [other, none] = toSeasonAwardEntries([
            {...base, players: {id: "p1", username: "a", player_team_seasons: [{season_id: "s2", teams: {name: "Vortex"}}]}},
            {...base, players: {id: "p2", username: "b"}},
        ]);
        expect(other.players.season_team_name).toBeNull();
        expect(none.players.season_team_name).toBeNull();
    });
});
