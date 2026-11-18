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

        const res = ok(validateAndCalculateMatchResult({
            sets: [
                { setNumber: 1, homeScore: 25, awayScore: 20 },
                { setNumber: 2, homeScore: 25, awayScore: 20 },
                { setNumber: 3, homeScore: 25, awayScore: 20 },
            ],
        }, seasonBo5));
        expect(res.value.homeTeamPoints).toBe(3.5); 
        expect(res.value.homeTeamBonus).toBe(2);
        expect(res.value.awayTeamPoints).toBe(0);
        expect(res.value.awayTeamBonus).toBe(0);
        expect(res.value.pointDiff).toBe(15);
    });

    it("3-1 win, diff exactly 10 → base 3.5, bonus +1; loser banks 0.5 for their set, no bonus", () => {

        const res = ok(validateAndCalculateMatchResult({
            sets: [
                { setNumber: 1, homeScore: 25, awayScore: 20 },
                { setNumber: 2, homeScore: 20, awayScore: 25 },
                { setNumber: 3, homeScore: 25, awayScore: 20 },
                { setNumber: 4, homeScore: 25, awayScore: 20 },
            ],
        }, seasonBo5));
        expect(res.value.homeTeamPoints).toBe(3.5); 
        expect(res.value.homeTeamBonus).toBe(1);
        expect(res.value.awayTeamPoints).toBe(0.5); 
        expect(res.value.awayTeamBonus).toBe(0);
        expect(res.value.pointDiff).toBe(10);
    });

    it("forfeit → winner base 2 + 0.5*minSets, flat bonus 1; loser 0; point_diff from 25-0 sweep", () => {

        const res = ok(validateAndCalculateMatchResult({
            sets: [],
            isForfeit: true,
            forfeitingTeam: "home",
        }, seasonBo5));
        expect(res.value.homeTeamPoints).toBe(0);
        expect(res.value.homeTeamBonus).toBe(0);
        expect(res.value.awayTeamPoints).toBe(3.5); 
        expect(res.value.awayTeamBonus).toBe(1);
        expect(res.value.pointDiff).toBe(-75); 
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
        expect(res.value.homeTeamPoints).toBe(2);   
        expect(res.value.awayTeamPoints).toBe(0);   
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
        expect(res.value.homeTeamPoints).toBe(1.5); 
        expect(res.value.awayTeamPoints).toBe(0.5); 
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

describe("double forfeit", () => {
    it.each(["lvr", "points", "points_without_bonus"] as const)("%s → both teams take the forfeiter penalty, 0-0 sets", method => {
        const res = ok(validateAndCalculateMatchResult({
            sets: [],
            isForfeit: true,
            forfeitingTeam: "both",
        }, seasonBo3, method));
        expect(res.value.homeSetsWon).toBe(0);
        expect(res.value.awaySetsWon).toBe(0);
        expect(res.value.homeTeamLvr).toBe(-10);
        expect(res.value.awayTeamLvr).toBe(-10);
        expect(res.value.homeTeamPoints).toBe(0);
        expect(res.value.awayTeamPoints).toBe(0);
        expect(res.value.homeTeamBonus).toBe(0);
        expect(res.value.awayTeamBonus).toBe(0);
        expect(res.value.pointDiff).toBe(0);
        expect(res.value.setsToInsert).toEqual([
            { setNumber: 1, homeScore: 0, awayScore: 0 },
            { setNumber: 2, homeScore: 0, awayScore: 0 },
        ]);
    });
});
