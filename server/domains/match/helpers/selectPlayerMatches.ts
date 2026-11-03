import type {PlayerMatchCandidate, PlayerMatchSide, PlayerRecentMatch, PlayerRosterWindow} from "../types";

export function compareMatchesNewestFirst(
    a: Pick<PlayerMatchCandidate, "scheduledAt">,
    b: Pick<PlayerMatchCandidate, "scheduledAt">,
): number {
    if (a.scheduledAt === null && b.scheduledAt === null) return 0;
    if (a.scheduledAt === null) return 1;
    if (b.scheduledAt === null) return -1;
    return new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime();
}

function wasSigned(window: PlayerRosterWindow, match: PlayerMatchCandidate): boolean {
    if (match.scheduledAt === null) return true;
    const at = new Date(match.scheduledAt).getTime();
    if (window.leftAt !== null && at > new Date(window.leftAt).getTime()) return false;
    if (match.seasonNumber < 2) return true;
    return at >= new Date(window.joinedAt).getTime();
}

function roundLabel(match: PlayerMatchCandidate): string {
    if (match.matchType === "playoffs") return match.matchCode ?? "Playoffs";
    return match.week !== null ? `Week ${match.week}` : "Season";
}

function playerTeamId(
    match: PlayerMatchCandidate,
    home: PlayerMatchSide,
    away: PlayerMatchSide,
    rosters: PlayerRosterWindow[],
    ownTeamByMatch: ReadonlyMap<string, string>,
    matchIdsWithStats: ReadonlySet<string>,
): string | null {
    if (matchIdsWithStats.has(match.id)) {
        const own = ownTeamByMatch.get(match.id);
        return own === home.id || own === away.id ? own : null;
    }
    const window = rosters.find(r =>
        r.seasonId === match.seasonId
        && (r.teamId === home.id || r.teamId === away.id)
        && wasSigned(r, match),
    );
    return window?.teamId ?? null;
}

export function selectPlayerMatches(p: {
    candidates: PlayerMatchCandidate[];
    rosters: PlayerRosterWindow[];
    ownMatches: {matchId: string; teamId: string}[];
    matchIdsWithStats: ReadonlySet<string>;
    limit: number;
}): PlayerRecentMatch[] {
    const ownTeamByMatch = new Map(p.ownMatches.map(own => [own.matchId, own.teamId]));
    const selected: PlayerRecentMatch[] = [];

    for (const match of [...p.candidates].sort(compareMatchesNewestFirst)) {
        if (selected.length === p.limit) break;
        const {home, away} = match;
        if (!home || !away || home.isBye || away.isBye) continue;

        const teamId = playerTeamId(match, home, away, p.rosters, ownTeamByMatch, p.matchIdsWithStats);
        if (teamId === null) continue;

        const isHome = teamId === home.id;
        selected.push({
            id: match.id,
            href: {
                matchCode: match.matchCode,
                homeTeamName: home.name,
                awayTeamName: away.name,
                regionCode: match.regionCode,
                seasonSlug: match.seasonSlug,
            },
            roundLabel: roundLabel(match),
            scheduledAt: match.scheduledAt,
            regionCode: match.regionCode,
            isForfeit: match.isForfeit,
            team: isHome ? home : away,
            opponent: isHome ? away : home,
            teamSets: isHome ? match.homeSetsWon : match.awaySetsWon,
            opponentSets: isHome ? match.awaySetsWon : match.homeSetsWon,
            setScores: [...match.sets]
                .sort((a, b) => a.setNumber - b.setNumber)
                .map(set => ({
                    team: isHome ? set.homeScore : set.awayScore,
                    opponent: isHome ? set.awayScore : set.homeScore,
                })),
        });
    }
    return selected;
}
