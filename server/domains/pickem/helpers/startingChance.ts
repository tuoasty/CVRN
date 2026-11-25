import type {PickemOutcomeDraft} from "../types";

export const LOGISTIC_K = 1.702;

export interface TeamRating {
    rating: number;
    sets: number;
}

export interface WinnerChanceSettings {
    sigma: number;
    shrinkSets: number;
    probClamp: number;
}

export function shrinkRating(team: TeamRating | null, shrinkSets: number): number {
    if (!team || team.sets <= 0) return 0;
    return team.rating * team.sets / (team.sets + shrinkSets);
}

export function setWinChance(margin: number, sigma: number): number {
    return 1 / (1 + Math.exp(-LOGISTIC_K * margin / sigma));
}

export function matchWinChance(setChance: number, bestOf: number): number {
    const q = setChance;
    if (bestOf === 5) return q ** 3 * (10 - 15 * q + 6 * q ** 2);
    return q ** 2 * (3 - 2 * q);
}

export function clampChance(chance: number, clamp: number): number {
    return Math.min(1 - clamp, Math.max(clamp, chance));
}

export function roundChance(chance: number): number {
    return Math.round(chance * 100_000) / 100_000;
}

export function homeWinChance(
    home: TeamRating | null,
    away: TeamRating | null,
    bestOf: number,
    settings: WinnerChanceSettings,
): number {
    const margin = shrinkRating(home, settings.shrinkSets) - shrinkRating(away, settings.shrinkSets);
    const q = setWinChance(margin, settings.sigma);
    return roundChance(clampChance(matchWinChance(q, bestOf), settings.probClamp));
}

export function winnerOutcomes(homeChance: number): PickemOutcomeDraft[] {
    return [
        {key: "home", label: "Home", startProb: homeChance},
        {key: "away", label: "Away", startProb: roundChance(1 - homeChance)},
    ];
}

export function matchLengthOutcomes(bestOf: number): PickemOutcomeDraft[] {
    const keys = bestOf === 5 ? ["3-0", "3-1", "3-2"] : ["2-0", "2-1"];
    const each = roundChance(1 / keys.length);
    return keys.map(key => ({key, label: key, startProb: each}));
}
