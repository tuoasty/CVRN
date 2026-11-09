import {describe, it, expect} from "vitest";
import {buildSeedMap} from "../buildSeedMap";

describe("buildSeedMap", () => {
    it("maps seed_home to home team and seed_away to away team", () => {
        expect(buildSeedMap([{seed_home: 1, seed_away: 8, home_team_id: "a", away_team_id: "b"}])).toEqual({a: 1, b: 8});
    });

    it("skips null seeds and null teams", () => {
        expect(buildSeedMap([{seed_home: null, seed_away: 4, home_team_id: "a", away_team_id: null}])).toEqual({});
    });

    it("keeps the first seed seen for a team", () => {
        expect(
            buildSeedMap([
                {seed_home: 9, seed_away: 10, home_team_id: "a", away_team_id: "b"},
                {seed_home: 2, seed_away: null, home_team_id: "a", away_team_id: "c"},
            ]),
        ).toEqual({a: 9, b: 10});
    });
});
