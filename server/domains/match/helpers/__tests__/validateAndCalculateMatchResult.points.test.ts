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

describe("points computation (base / bonus split)", () => {
    it("3-0 win, diff exactly 15 → base 3.5, bonus +2 (>= boundary inclusive); loser 0", () => {
        // home wins 25-20, 25-20, 25-20 → totalHome 75, totalAway 60, diff 15.
        // diff 15 hits the >=15 tier (+2) exactly — proves inclusive boundary.
        const res = ok(validateAndCalculateMatchResult({
            sets: [
                { setNumber: 1, homeScore: 25, awayScore: 20 },
                { setNumber: 2, homeScore: 25, awayScore: 20 },
                { setNumber: 3, homeScore: 25, awayScore: 20 },
            ],
        }, seasonBo5));
        expect(res.value.homeTeamPoints).toBe(3.5); // 2 + 0.5*3 (base only)
        expect(res.value.homeTeamBonus).toBe(2);
        expect(res.value.awayTeamPoints).toBe(0);
        expect(res.value.awayTeamBonus).toBe(0);
        expect(res.value.pointDiff).toBe(15);
    });

    it("3-1 win, diff exactly 10 → base 3.5, bonus +1; loser banks 0.5 for their set, no bonus", () => {
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
        expect(res.value.homeTeamPoints).toBe(3.5); // 2 + 0.5*3 (base only)
        expect(res.value.homeTeamBonus).toBe(1);
        expect(res.value.awayTeamPoints).toBe(0.5); // 0.5*1 (base only)
        expect(res.value.awayTeamBonus).toBe(0);
        expect(res.value.pointDiff).toBe(10);
    });

    it("forfeit → winner base 2 + 0.5*minSets, flat bonus 1; loser 0; point_diff from 25-0 sweep", () => {
        // BO5, home forfeits → away wins 3 sets (25-0 each)
        const res = ok(validateAndCalculateMatchResult({
            sets: [],
            isForfeit: true,
            forfeitingTeam: "home",
        }, seasonBo5));
        expect(res.value.homeTeamPoints).toBe(0);
        expect(res.value.homeTeamBonus).toBe(0);
        expect(res.value.awayTeamPoints).toBe(3.5); // 2 + 0.5*3 (base only)
        expect(res.value.awayTeamBonus).toBe(1);
        expect(res.value.pointDiff).toBe(-75); // -25 * 3 (home-relative)
    });

    it("playoff match → points, bonus, and point_diff are null", () => {
        const res = ok(validateAndCalculateMatchResult({
            sets: [
                { setNumber: 1, homeScore: 25, awayScore: 20 },
                { setNumber: 2, homeScore: 25, awayScore: 20 },
            ],
        }, { ...seasonBo5, match_type: "playoffs", best_of: 3 }));
        expect(res.value.homeTeamPoints).toBeNull();
        expect(res.value.awayTeamPoints).toBeNull();
        expect(res.value.homeTeamBonus).toBeNull();
        expect(res.value.awayTeamBonus).toBeNull();
        expect(res.value.pointDiff).toBeNull();
    });
});

const seasonBo3: MatchContext = {
    best_of: 3,
    match_type: "season",
    home_team_id: "h",
    away_team_id: "a",
};

describe("points_without_bonus (EU) computation", () => {
    it("2-0 win → winner 2, loser 0; never any bonus", () => {
        const res = ok(validateAndCalculateMatchResult({
            sets: [
                { setNumber: 1, homeScore: 25, awayScore: 20 },
                { setNumber: 2, homeScore: 25, awayScore: 20 },
            ],
        }, seasonBo3, "points_without_bonus"));
        expect(res.value.homeTeamPoints).toBe(2);   // 2 - 0.5*0
        expect(res.value.awayTeamPoints).toBe(0);   // 0.5*0
        expect(res.value.homeTeamBonus).toBe(0);
        expect(res.value.awayTeamBonus).toBe(0);
    });

    it("2-1 win → winner 1.5, loser 0.5", () => {
        const res = ok(validateAndCalculateMatchResult({
            sets: [
                { setNumber: 1, homeScore: 25, awayScore: 20 },
                { setNumber: 2, homeScore: 20, awayScore: 25 },
                { setNumber: 3, homeScore: 25, awayScore: 20 },
            ],
        }, seasonBo3, "points_without_bonus"));
        expect(res.value.homeTeamPoints).toBe(1.5); // 2 - 0.5*1
        expect(res.value.awayTeamPoints).toBe(0.5); // 0.5*1
        expect(res.value.homeTeamBonus).toBe(0);
        expect(res.value.awayTeamBonus).toBe(0);
    });

    it("forfeit → winner 1, loser 0", () => {
        const res = ok(validateAndCalculateMatchResult({
            sets: [],
            isForfeit: true,
            forfeitingTeam: "home",
        }, seasonBo3, "points_without_bonus"));
        expect(res.value.homeTeamPoints).toBe(0);
        expect(res.value.awayTeamPoints).toBe(1);
        expect(res.value.homeTeamBonus).toBe(0);
        expect(res.value.awayTeamBonus).toBe(0);
    });
});
