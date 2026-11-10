import { notFound } from "next/navigation";
import StandingsPage from "@/app/(public)/standings/StandingsPage";
import {
    getCachedRegionByCode,
    getCachedSeasonBySlugAndRegion,
    getCachedSeasonCompletedMatches,
    getCachedSeasonUpcomingMatches,
    getCachedStandings,
} from "@/server/cache/publicReads";
import { safeDecodeURIComponent } from "@/app/utils/decodeURI";
import { buildStandingsTable } from "@/app/features/standings/model/buildStandingsTable";
import type { StandingMethod } from "@/shared/types/standing";

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

    const [standings, completed, upcoming] = await Promise.all([
        getCachedStandings(seasonRecord.id, regionRecord.id),
        getCachedSeasonCompletedMatches(seasonRecord.id),
        getCachedSeasonUpcomingMatches(seasonRecord.id),
    ]);

    const model = buildStandingsTable({
        standings,
        completed,
        upcoming,
        method: regionRecord.standing_method as StandingMethod,
        qualifiedTeams: seasonRecord.playoff_configs?.qualified_teams,
        playinTeams: seasonRecord.playoff_configs?.playin_teams,
    });

    return <StandingsPage season={seasonRecord} region={regionRecord} model={model} />;
}
