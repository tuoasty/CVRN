
export const REBRAND_MIN_OVERLAP = 0.34;

export function classifyTeamNameChange(
    oldRoster: {usernames: string[]},
    newRoster: {usernames: string[]; captain: string | null}
): 'rebrand' | 'disband' {
    const oldSet = new Set(oldRoster.usernames);

    if (newRoster.captain && oldSet.has(newRoster.captain)) return 'rebrand';

    const newSet = new Set(newRoster.usernames);
    if (oldSet.size === 0 || newSet.size === 0) return 'rebrand';

    let shared = 0;
    for (const u of newSet) if (oldSet.has(u)) shared++;

    const overlap = shared / Math.min(oldSet.size, newSet.size);
    return overlap < REBRAND_MIN_OVERLAP ? 'disband' : 'rebrand';
}
