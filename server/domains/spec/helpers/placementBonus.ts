/**
 * Placement bonus — how a team's playoff finish bends its players' spec thresholds.
 *
 * Hardcoded rather than stored: these are league rules, not per-season calibration,
 * and a table for four numbers that never move is a table nobody maintains.
 *
 * Placement is the season podium (playoff results), which only ranks the top 3.
 * "Not in the top 3" therefore covers everyone else in the league, which is most
 * of it — the -10% is the common case, not the exception.
 *
 *            1st     2nd     3rd     outside
 *   5-star   +15%     0%     -5%      -10%
 *   4-star   +15%     0%      0%      -10%
 *   3-star   +15%     0%      0%      -10%
 *
 * A 5-star contends for the top 2, so 3rd sits one place outside its field and
 * takes a partial penalty. The lower tiers contend for the whole podium, so
 * anywhere on it is neutral.
 */
export const FIRST_PLACE_BONUS = 0.15;
export const OUTSIDE_PODIUM_PENALTY = -0.1;
/** 5-star only: on the podium but outside its top-2 field. */
export const FIVE_STAR_THIRD_PENALTY = -0.05;

/**
 * Returns a multiplier offset: +0.15 means the player's stats count for 15% more.
 * `placement` is null for any player whose team did not finish top 3.
 */
export function placementBonus(placement: number | null | undefined, stars: number): number {
    if (placement === null || placement === undefined) return OUTSIDE_PODIUM_PENALTY;
    if (placement === 1) return FIRST_PLACE_BONUS;
    if (placement > 3) return OUTSIDE_PODIUM_PENALTY;

    return stars === 5 && placement === 3 ? FIVE_STAR_THIRD_PENALTY : 0;
}

/** "+15%" / "-10%" / "—", for table cells. */
export function formatPlacementBonus(bonus: number): string {
    if (bonus === 0) return "—";
    const pct = Math.round(bonus * 1000) / 10;
    return bonus > 0 ? `+${pct}%` : `${pct}%`;
}
