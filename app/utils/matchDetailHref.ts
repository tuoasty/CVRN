export function toSlug(s: string): string {
    return s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

type BuildPublicMatchHrefArgs = {
    matchCode: string | null;
    homeTeamName?: string | null;
    awayTeamName?: string | null;
    regionCode?: string;
    seasonSlug?: string;
};

export function buildPublicMatchHref(args: BuildPublicMatchHrefArgs): string | null {
    if (!args.regionCode || !args.seasonSlug || !args.matchCode) return null;
    if (!args.homeTeamName || !args.awayTeamName) return null;
    const teams = `${toSlug(args.homeTeamName)}-vs-${toSlug(args.awayTeamName)}`;
    return `/matches/${encodeURIComponent(args.regionCode.toLowerCase())}/${encodeURIComponent(args.seasonSlug.toLowerCase())}/${encodeURIComponent(args.matchCode.toLowerCase())}/${encodeURIComponent(teams)}`;
}

export function buildAdminMatchHref(matchId: string): string {
    return `/admin/matches/${matchId}`;
}

type BuildPublicTeamHrefArgs = {
    regionCode?: string;
    seasonSlug?: string;
    teamName?: string | null;
};

export function buildPublicTeamHref(args: BuildPublicTeamHrefArgs): string | null {
    if (!args.regionCode || !args.seasonSlug || !args.teamName) return null;
    return `/teams/${encodeURIComponent(args.regionCode.toLowerCase())}/${encodeURIComponent(args.seasonSlug.toLowerCase())}/${encodeURIComponent(toSlug(args.teamName))}`;
}

export function buildPublicPlayerHref(username: string | null | undefined): string | null {
    if (!username) return null;
    return `/players/${encodeURIComponent(username.toLowerCase())}`;
}
