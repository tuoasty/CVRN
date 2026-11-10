import {buildAdminMatchHref, buildPublicMatchHref} from "@/app/utils/matchDetailHref";
import type {StandingsLinkMode} from "./StandingsGrid";

export function fixtureHref(p: {
    linkMode: StandingsLinkMode;
    matchId: string;
    matchCode: string | null;
    homeTeamName: string | null;
    awayTeamName: string | null;
    regionCode: string;
    seasonSlug: string;
}): string | null {
    if (p.linkMode === "admin") return buildAdminMatchHref(p.matchId);
    return buildPublicMatchHref({
        matchCode: p.matchCode,
        homeTeamName: p.homeTeamName,
        awayTeamName: p.awayTeamName,
        regionCode: p.regionCode,
        seasonSlug: p.seasonSlug,
    });
}
