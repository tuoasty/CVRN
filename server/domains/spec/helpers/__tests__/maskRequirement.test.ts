import {describe, expect, it} from "vitest";
import {
    ntileTier,
    tierForRequirement,
    TIER_WORD,
    TIER_COUNT,
    MODERATE_TIER,
    MIN_STAT_SAMPLE,
    setsFloorForStars,
} from "../maskRequirement";

describe("setsFloorForStars", () => {
    it("returns the per-star eligibility floor", () => {
        expect(setsFloorForStars(3)).toBe(6);
        expect(setsFloorForStars(4)).toBe(8);
        expect(setsFloorForStars(5)).toBe(10);
    });

    it("falls back to 10 for any other star value", () => {
        expect(setsFloorForStars(2)).toBe(10);
    });
});

describe("ntileTier", () => {
    it("ranks the lowest value into the lowest tier and the highest into the top", () => {
        const values = [10, 20, 30, 40, 50, 60];
        expect(ntileTier(10, values)).toBe(1);
        expect(ntileTier(60, values)).toBe(TIER_COUNT);
    });

    it("assigns non-decreasing tiers as the value rises, spanning bottom to top", () => {
        const values = [10, 20, 30, 40, 50, 60];
        const tiers = values.map(v => ntileTier(v, values));
        for (let i = 1; i < tiers.length; i++) {
            expect(tiers[i]).toBeGreaterThanOrEqual(tiers[i - 1]);
        }
        expect(tiers[0]).toBe(1);
        expect(tiers[tiers.length - 1]).toBe(TIER_COUNT);
    });

    it("gives tied values the same tier", () => {
        const values = [10, 10, 10, 60];
        expect(ntileTier(10, values)).toBe(1);
        expect(ntileTier(60, values)).toBe(TIER_COUNT);
    });

    it("puts every identical value in the lowest tier (no spread possible)", () => {
        const values = [0.4, 0.4, 0.4, 0.4];
        expect(ntileTier(0.4, values)).toBe(1);
    });

    it("honors an explicit 4-tile split", () => {
        const values = [10, 20, 30, 40, 50, 60, 70, 80];
        expect(ntileTier(10, values, 4)).toBe(1);
        expect(ntileTier(30, values, 4)).toBe(2);
        expect(ntileTier(50, values, 4)).toBe(3);
        expect(ntileTier(80, values, 4)).toBe(4);
    });

    it("defaults to Moderate on an empty distribution", () => {
        expect(ntileTier(50, [])).toBe(MODERATE_TIER);
    });
});

describe("tierForRequirement", () => {
    it("defaults under-sampled stats to Moderate", () => {
        const thin = [30, 55];
        expect(thin.length).toBeLessThan(MIN_STAT_SAMPLE);
        expect(tierForRequirement(55, thin)).toBe(MODERATE_TIER);
        expect(tierForRequirement(30, thin)).toBe(MODERATE_TIER);
    });

    it("ranks once the sample is large enough", () => {
        const values = [20, 30, 40, 55];
        expect(values.length).toBeGreaterThanOrEqual(MIN_STAT_SAMPLE);
        expect(tierForRequirement(55, values)).toBe(TIER_COUNT);
        expect(tierForRequirement(20, values)).toBe(1);
    });
});

describe("TIER_WORD", () => {
    it("labels the active tier scheme monotonically", () => {
        expect(TIER_WORD[TIER_COUNT]).toBe("Very High");
        expect(TIER_WORD[1]).toBe("Fair");
    });
});
