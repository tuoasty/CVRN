export function getFirstRoundSeeding(
    qualifiedCount: number,
    playinCount: number,
    matchIndex: number
): {
    homeSeed: number;
    awayType: 'qualified' | 'playin';
    awaySeed?: number;
    playinLowerSeed?: number;
} {
    const playinWinners = playinCount / 2;
    const totalFirstRoundTeams = qualifiedCount + playinWinners;
    const firstRoundMatchCount = totalFirstRoundTeams / 2;

    if (playinCount > 0) {
        const topSeedsWithPlayins = playinWinners;

        if (matchIndex < topSeedsWithPlayins) {
            const homeSeed = matchIndex + 1;
            const playinMatchIndex = playinWinners - matchIndex - 1;
            const playinLowerSeed = qualifiedCount + playinCount - playinMatchIndex;

            return {
                homeSeed,
                awayType: 'playin',
                playinLowerSeed
            };
        } else {
            const adjustedIndex = matchIndex - topSeedsWithPlayins;
            const homeSeed = topSeedsWithPlayins + adjustedIndex + 1;
            const awaySeed = qualifiedCount - adjustedIndex;

            return {
                homeSeed,
                awayType: 'qualified',
                awaySeed
            };
        }
    } else {
        const homeSeed = matchIndex + 1;
        const awaySeed = qualifiedCount - matchIndex;

        return {
            homeSeed,
            awayType: 'qualified',
            awaySeed
        };
    }
}
