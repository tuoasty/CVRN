// Below this share of the SMALLER roster carrying over, a same-slot name change
// whose new captain is an outsider is treated as a brand-new team (disband).
export const REBRAND_MIN_OVERLAP = 0.34;

/**
 * Decide whether a team that changed names at the same sheet slot is the same
 * team rebranding, or a new team that replaced a disbanded one.
 *
 * The captain anchors team identity. If the NEW captain was on the old roster
 * (same captain, or an old member promoted), leadership carried over -> rebrand.
 * Only when the new captain is an outsider (or absent) do we fall back to the
 * overlap coefficient |shared| / min(|old|, |new|): "18->18 all new" and
 * "reduced to only a new captain" both collapse to ~0 overlap -> disband.
 * All usernames must be pre-lowercased by the caller.
 */
export function classifyTeamNameChange(
    oldRoster: {usernames: string[]},
    newRoster: {usernames: string[]; captain: string | null}
): 'rebrand' | 'disband' {
    const oldSet = new Set(oldRoster.usernames);

    // Leadership continuity: new captain was already on the old team -> same team.
    if (newRoster.captain && oldSet.has(newRoster.captain)) return 'rebrand';

    const newSet = new Set(newRoster.usernames);
    if (oldSet.size === 0 || newSet.size === 0) return 'rebrand';

    let shared = 0;
    for (const u of newSet) if (oldSet.has(u)) shared++;

    const overlap = shared / Math.min(oldSet.size, newSet.size);
    return overlap < REBRAND_MIN_OVERLAP ? 'disband' : 'rebrand';
}
