import {describe, expect, it} from "vitest";
import {buildPublishDrafts} from "../buildPublishDrafts";
import type {PickemMatchSource} from "../../types";

const SETTINGS = {sigma: 5.5, shrinkSets: 6, probClamp: 0.03};

function match(id: string, homeId: string, awayId: string, bestOf: number): PickemMatchSource {
    return {
        id,
        matchCode: null,
        matchType: "season",
        status: "scheduled",
        week: 1,
        bestOf,
        scheduledAt: "2026-11-26T18:00:00Z",
        home: {id: homeId, name: homeId, logoUrl: null},
        away: {id: awayId, name: awayId, logoUrl: null},
        result: null,
    };
}

describe("buildPublishDrafts", () => {
    const ratings = new Map([
        ["strong", {rating: 3, sets: 12}],
        ["weak", {rating: -1, sets: 6}],
    ]);

    it("creates a winner and a match length market for every match", () => {
        const drafts = buildPublishDrafts([match("m1", "strong", "weak", 3), match("m2", "weak", "strong", 5)], ratings, SETTINGS);
        expect(drafts.map(d => [d.matchId, d.kind])).toEqual([
            ["m1", "winner"],
            ["m1", "match_length"],
            ["m2", "winner"],
            ["m2", "match_length"],
        ]);
    });

    it("uses each team's rating, from the home side's point of view", () => {
        const [m1Winner, , m2Winner] = buildPublishDrafts([match("m1", "strong", "weak", 3), match("m2", "weak", "strong", 5)], ratings, SETTINGS);
        expect(m1Winner.outcomes.map(o => o.startProb)).toEqual([0.76394, 0.23606]);
        expect(m2Winner.outcomes.map(o => o.startProb)).toEqual([0.18445, 0.81555]);
    });

    it("opens a team with no rating row as average", () => {
        const [winner] = buildPublishDrafts([match("m1", "new", "other-new", 3)], ratings, SETTINGS);
        expect(winner.outcomes.map(o => o.startProb)).toEqual([0.5, 0.5]);
    });
});
