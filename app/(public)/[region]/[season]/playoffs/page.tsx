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

    if (!seasonRecord.playoff_started) {
        return <PlayoffsPage brackets={[]} matches={[]} teams={[]} />;
    }

    const [brackets, matches, allTeams] = await Promise.all([
        getCachedPlayoffBrackets(seasonRecord.id),
        getCachedPlayoffMatches(seasonRecord.id),
        getCachedTeamsWithRegions(),
    ]);

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
