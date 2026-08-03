/**
 * Placement bonus — how a team's playoff run bends its players' spec thresholds.
 *
 * The band is the team's SLOT in the finals, not its finish. A double-elim upper
 * finalist arrives at the grand final having played several fewer matches than the
 * lower-bracket team it meets there, so its players' season totals are suppressed by
 * sample size rather than by ability. The bonus compensates that — which is why it
 * stays with the upper finalist even when they go on to lose the grand final, and why
 * a lower-bracket team that wins the championship still sits in the neutral band.
 *
 *                     upper    finals    3rd     rest
 *   5-star            +15%       0%     -5%     -10%
 *   4-star            +15%       0%      0%     -10%
 *   3-star            +15%       0%      0%     -10%
 *
 * Single-elim seasons have no upper band at all: both finalists played the same number
 * of matches, so there is nothing to compensate. Both land in `finalist`.
 *
 * A 5-star contends for the top 2, so third sits one place outside its field and takes a
 * partial penalty. The lower tiers contend for the whole podium, so anywhere on it is
 * neutral. Everyone else is most of the league — the -10% is the common case.
 *
 * Hardcoded rather than stored: these are league rules, not per-season calibration, and
 * a table for four numbers that never move is a table nobody maintains.
 */

import type {SeasonFinalsSlots} from "@/server/domains/season/queries/getSeasonFinalsSlots";

export type PlacementTier =
    /** Double-elim only: home slot of the grand final, i.e. the upper-bracket finalist. */
    | "upper_finalist"
    /** Grand-final away slot, or either finalist in a single-elim season. */
    | "finalist"
    | "third"
    | "outside";

export const UPPER_FINALIST_BONUS = 0.15;
export const OUTSIDE_PENALTY = -0.1;
/** 5-star only: on the podium but outside its top-2 field. */
export const FIVE_STAR_THIRD_PENALTY = -0.05;

/** Returns a multiplier offset: +0.15 means the player's stats count for 15% more. */
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

/**
 * Flattens bracket slots into a team -> tier lookup. Teams absent from the result are
 * `outside`, which is most of the league, so the map only ever holds three or four rows.
 *
 * A plain object rather than a Map: this crosses the server-action boundary as JSON.
 */
export function placementTiersFromSlots(slots: SeasonFinalsSlots): Record<string, PlacementTier> {
    const tiers: Record<string, PlacementTier> = {};

    if (slots.upperFinalistTeamId) tiers[slots.upperFinalistTeamId] = "upper_finalist";
    for (const teamId of slots.finalistTeamIds) tiers[teamId] = "finalist";
    if (slots.thirdTeamId) tiers[slots.thirdTeamId] = "third";

    return tiers;
}

/** "+15%" / "-10%" / "—", for table cells. */
export function formatPlacementBonus(bonus: number): string {
    if (bonus === 0) return "—";
    const pct = Math.round(bonus * 1000) / 10;
    return bonus > 0 ? `+${pct}%` : `${pct}%`;
}
