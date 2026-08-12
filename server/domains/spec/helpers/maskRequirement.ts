import type {SpecDifficultyTier} from "../types/publicSnapshot";

export const SETS_FLOOR_BY_STAR: Record<number, number> = {3: 6, 4: 8, 5: 10};

export const DEFAULT_SETS_FLOOR = 10;

export function setsFloorForStars(stars: number): number {
    return SETS_FLOOR_BY_STAR[stars] ?? DEFAULT_SETS_FLOOR;
}

export const TIER_COUNT = 4;

export const MIN_STAT_SAMPLE = 4;

const TIER_WORDS_BY_COUNT: Record<number, Record<number, string>> = {
    3: {1: "Moderate", 2: "High", 3: "Very High"},
    4: {1: "Fair", 2: "Moderate", 3: "High", 4: "Very High"},
};

export const TIER_WORD: Record<number, string> = TIER_WORDS_BY_COUNT[TIER_COUNT];

export const MODERATE_TIER: SpecDifficultyTier = (TIER_COUNT === 3 ? 1 : 2) as SpecDifficultyTier;

export function ntileTier(
    value: number,
    values: readonly number[],
    tierCount: number = TIER_COUNT
): SpecDifficultyTier {
    const n = values.length;
    if (n === 0) return MODERATE_TIER;
    const below = values.reduce((count, v) => count + (v < value ? 1 : 0), 0);
    const frac = below / n;
    const tier = Math.min(tierCount, Math.floor(frac * tierCount) + 1);
    return Math.max(1, tier) as SpecDifficultyTier;
}

export function tierForRequirement(
    value: number,
    values: readonly number[]
): SpecDifficultyTier {
    if (values.length < MIN_STAT_SAMPLE) return MODERATE_TIER;
    return ntileTier(value, values, TIER_COUNT);
}
