import { describe, it, expect } from "vitest";
import { validateAndCalculateMatchResult } from "../validateAndCalculateMatchResult";
import type { MatchContext } from "../../types";

const seasonBo5: MatchContext = {
    best_of: 5,
    match_type: "season",
    home_team_id: "h",
    away_team_id: "a",
};

function ok<T extends { ok: boolean }>(r: T) {
    if (!r.ok) throw new Error("expected Ok");
    return r as Extract<T, { ok: true }>;
}

describe("points computation", () => {
    it("3-0 win, diff exactly 15 → +2 tier (>= boundary is inclusive); loser 0", () => {
        // home wins 25-20, 25-20, 25-20 → totalHome 75, totalAway 60, diff 15.
        // diff 15 hits the >=15 tier (+2) exactly — proves inclusive boundary.
        const res = ok(validateAndCalculateMatchResult({
            sets: [
                { setNumber: 1, homeScore: 25, awayScore: 20 },
                { setNumber: 2, homeScore: 25, awayScore: 20 },
                { setNumber: 3, homeScore: 25, awayScore: 20 },
            ],
        }, seasonBo5));
        expect(res.value.homeTeamPoints).toBe(5.5); // 2 + 0.5*3 + 2
        expect(res.value.awayTeamPoints).toBe(0);
    });

    it("3-1 win, diff exactly 10 → +1 tier (>= boundary is inclusive); loser banks 0.5 for their set", () => {
        // home wins sets 1,3,4; away wins set 2. totalHome 95, totalAway 85, diff 10.
        // diff 10 hits the >=10 tier (+1) exactly — proves inclusive boundary.
        const res = ok(validateAndCalculateMatchResult({
            sets: [
                { setNumber: 1, homeScore: 25, awayScore: 20 },
                { setNumber: 2, homeScore: 20, awayScore: 25 },
                { setNumber: 3, homeScore: 25, awayScore: 20 },
                { setNumber: 4, homeScore: 25, awayScore: 20 },
            ],
        }, seasonBo5));
        expect(res.value.homeTeamPoints).toBe(4.5); // 2 + 0.5*3 + 1
        expect(res.value.awayTeamPoints).toBe(0.5); // 0 + 0.5*1 + 0
    });

    it("forfeit → winner 2 + 0.5*minSets + 1; loser 0", () => {
        // BO5, home forfeits → away wins 3 sets (25-0 each)
        const res = ok(validateAndCalculateMatchResult({
            sets: [],
            isForfeit: true,
            forfeitingTeam: "home",
        }, seasonBo5));
        expect(res.value.homeTeamPoints).toBe(0);
        expect(res.value.awayTeamPoints).toBe(4.5); // 2 + 0.5*3 + 1
    });

    it("playoff match → points are null", () => {
        const res = ok(validateAndCalculateMatchResult({
            sets: [
                { setNumber: 1, homeScore: 25, awayScore: 20 },
                { setNumber: 2, homeScore: 25, awayScore: 20 },
            ],
        }, { ...seasonBo5, match_type: "playoffs", best_of: 3 }));
        expect(res.value.homeTeamPoints).toBeNull();
        expect(res.value.awayTeamPoints).toBeNull();
    });
});
