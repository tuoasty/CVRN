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
    return `/matches/${encodeURIComponent(args.regionCode)}/${encodeURIComponent(args.seasonSlug)}/${encodeURIComponent(args.matchCode)}/${encodeURIComponent(teams)}`;
}

export function buildAdminMatchHref(matchId: string): string {
    return `/admin/matches/${matchId}`;
}
