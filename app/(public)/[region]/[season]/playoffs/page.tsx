import { notFound } from "next/navigation";
import PlayoffsPage from "@/app/(public)/playoffs/PlayoffsPage";
import {
    getCachedRegionByCode,
    getCachedSeasonBySlugAndRegion,
    getCachedPlayoffBrackets,
    getCachedPlayoffMatches,
    getCachedTeamsWithRegions,
} from "@/server/cache/publicReads";
import { safeDecodeURIComponent } from "@/app/utils/decodeURI";

type PageProps = {
    params: Promise<{ region: string; season: string }>;
};

export default async function Page({ params }: PageProps) {
    const { region, season } = await params;

    const regionRecord = await getCachedRegionByCode(safeDecodeURIComponent(region).toLowerCase());
    if (!regionRecord) notFound();

    const seasonRecord = await getCachedSeasonBySlugAndRegion(
        safeDecodeURIComponent(season).toLowerCase(),
        regionRecord.id,
    );
    if (!seasonRecord) notFound();

    // Skip the queries entirely when playoffs have not started — the page renders an empty
    // state in that case and never touches brackets.
    if (!seasonRecord.playoff_started) {
        return <PlayoffsPage brackets={[]} matches={[]} teams={[]} />;
    }

    // The bracket display used to fetch these itself, via `useAllMatches()` — an unfiltered
    // `select("*")` over the whole matches table — plus `useTeams()`, on every view. Both
    // are now resolved here, scoped and cached.
    const [brackets, matches, allTeams] = await Promise.all([
        getCachedPlayoffBrackets(seasonRecord.id),
        getCachedPlayoffMatches(seasonRecord.id),
        getCachedTeamsWithRegions(),
    ]);

    // Only the teams actually on a bracket match. Filtering the shared all-teams cache entry
    // in memory avoids minting a per-season cache key for what is a ~220-row list.
    const bracketTeamIds = new Set(
        matches.flatMap((m) => [m.home_team_id, m.away_team_id].filter((id): id is string => !!id)),
    );

    return (
        <PlayoffsPage
            brackets={brackets}
            matches={matches}
            teams={allTeams.filter((t) => bracketTeamIds.has(t.id))}
        />
    );
}
