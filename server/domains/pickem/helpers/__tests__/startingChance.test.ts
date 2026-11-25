import {describe, expect, it} from "vitest";
import {
    clampChance,
    homeWinChance,
    matchLengthOutcomes,
    matchWinChance,
    setWinChance,
    shrinkRating,
    winnerOutcomes,
} from "../startingChance";

const SETTINGS = {sigma: 5.5, shrinkSets: 6, probClamp: 0.03};

describe("shrinkRating", () => {
    it("pulls a rating toward 0 by sets / (sets + shrinkSets)", () => {
        expect(shrinkRating({rating: 4, sets: 6}, 6)).toBe(2);
        expect(shrinkRating({rating: 3, sets: 12}, 6)).toBe(2);
    });

    it("treats a team with no rated sets as average", () => {
        expect(shrinkRating(null, 6)).toBe(0);
        expect(shrinkRating({rating: 5, sets: 0}, 6)).toBe(0);
    });

    it("leaves the rating alone when shrinkage is 0", () => {
        expect(shrinkRating({rating: -2.5, sets: 3}, 0)).toBe(-2.5);
    });
});

describe("setWinChance", () => {
    it("is a coin flip at margin 0", () => {
        expect(setWinChance(0, 5.5)).toBe(0.5);
    });

    it("is symmetric between the two teams", () => {
        expect(setWinChance(2.5, 5.5) + setWinChance(-2.5, 5.5)).toBeCloseTo(1, 12);
    });

    it("grows with the margin and shrinks with sigma", () => {
        expect(setWinChance(2.5, 5.5)).toBeCloseTo(0.684307, 6);
        expect(setWinChance(5, 5.5)).toBeGreaterThan(setWinChance(2.5, 5.5));
        expect(setWinChance(2.5, 11)).toBeLessThan(setWinChance(2.5, 5.5));
    });
});

describe("matchWinChance", () => {
    it("keeps a coin flip a coin flip", () => {
        expect(matchWinChance(0.5, 3)).toBe(0.5);
        expect(matchWinChance(0.5, 5)).toBe(0.5);
    });

    it("turns a 60% set chance into the Bo3 and Bo5 match chance", () => {
        expect(matchWinChance(0.6, 3)).toBeCloseTo(0.648, 12);
        expect(matchWinChance(0.6, 5)).toBeCloseTo(0.68256, 12);
    });

    it("rewards the stronger team more in a longer match", () => {
        expect(matchWinChance(0.7, 5)).toBeGreaterThan(matchWinChance(0.7, 3));
    });
});

describe("clampChance", () => {
    it("keeps every outcome between clamp and 1 - clamp", () => {
        expect(clampChance(0.999, 0.03)).toBe(0.97);
        expect(clampChance(0.001, 0.03)).toBe(0.03);
        expect(clampChance(0.5, 0.03)).toBe(0.5);
    });
});

describe("homeWinChance", () => {
    it("runs the worked example: home 3.0 over 12 sets, away -1.0 over 6 sets, Bo3", () => {
        const chance = homeWinChance({rating: 3, sets: 12}, {rating: -1, sets: 6}, 3, SETTINGS);
        expect(chance).toBe(0.76394);
    });

    it("gives the same teams a higher chance in a Bo5", () => {
        const chance = homeWinChance({rating: 3, sets: 12}, {rating: -1, sets: 6}, 5, SETTINGS);
        expect(chance).toBe(0.81555);
    });

    it("opens even when neither team has played", () => {
        expect(homeWinChance(null, null, 3, SETTINGS)).toBe(0.5);
    });

    it("never opens beyond the clamp", () => {
        expect(homeWinChance({rating: 40, sets: 30}, {rating: -40, sets: 30}, 5, SETTINGS)).toBe(0.97);
    });
});

describe("winnerOutcomes", () => {
    it("splits the chance between home and away so it adds up to 1", () => {
        const outcomes = winnerOutcomes(0.76394);
        expect(outcomes.map(o => o.key)).toEqual(["home", "away"]);
        expect(outcomes[1].startProb).toBe(0.23606);
        expect(outcomes.reduce((sum, o) => sum + o.startProb, 0)).toBeCloseTo(1, 10);
    });
});

describe("matchLengthOutcomes", () => {
    it("opens Bo3 lengths even", () => {
        expect(matchLengthOutcomes(3)).toEqual([
            {key: "2-0", label: "2-0", startProb: 0.5},
            {key: "2-1", label: "2-1", startProb: 0.5},
        ]);
    });

    it("opens Bo5 lengths even within rounding", () => {
        const outcomes = matchLengthOutcomes(5);
        expect(outcomes.map(o => o.key)).toEqual(["3-0", "3-1", "3-2"]);
        expect(outcomes.every(o => o.startProb === 0.33333)).toBe(true);
        expect(Math.abs(outcomes.reduce((sum, o) => sum + o.startProb, 0) - 1)).toBeLessThan(0.001);
    });
});
