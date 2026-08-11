
import type {SeasonFinalsSlots} from "@/server/domains/season/queries/getSeasonFinalsSlots";

export type PlacementTier =

    | "upper_finalist"

    | "finalist"
    | "third"
    | "outside";

export const UPPER_FINALIST_BONUS = 0.25;
export const OUTSIDE_PENALTY = -0.1;

export const FIVE_STAR_THIRD_PENALTY = -0.05;

export function placementBonus(tier: PlacementTier, stars: number): number {
    switch (tier) {
        case "upper_finalist":
            return UPPER_FINALIST_BONUS;
        case "finalist":
            return 0;
        case "third":
            return stars === 5 ? FIVE_STAR_THIRD_PENALTY : 0;
        case "outside":
            return OUTSIDE_PENALTY;
    }
}

export const PLACEMENT_TIER_LABEL: Record<PlacementTier, string> = {
    upper_finalist: "Upper final",
    finalist: "Final",
    third: "3rd",
    outside: "—",
};

export function placementTiersFromSlots(slots: SeasonFinalsSlots): Record<string, PlacementTier> {
    const tiers: Record<string, PlacementTier> = {};

    if (slots.upperFinalistTeamId) tiers[slots.upperFinalistTeamId] = "upper_finalist";
    for (const teamId of slots.finalistTeamIds) tiers[teamId] = "finalist";
    if (slots.thirdTeamId) tiers[slots.thirdTeamId] = "third";

    return tiers;
}

export function formatPlacementBonus(bonus: number): string {
    if (bonus === 0) return "—";
    const pct = Math.round(bonus * 1000) / 10;
    return bonus > 0 ? `+${pct}%` : `${pct}%`;
}
