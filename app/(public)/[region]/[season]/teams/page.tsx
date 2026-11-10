import { notFound } from "next/navigation";
import TeamsPage from "@/app/(public)/teams/TeamsPage";
import {
    getCachedRegionByCode,
    getCachedSeasonBySlugAndRegion,
    getCachedSeasonRosters,
    getCachedTeamStrengths,
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

    const [allTeams, strengths, rosters] = await Promise.all([
        getCachedTeamsWithRegions(),
        getCachedTeamStrengths(seasonRecord.season_number),
        getCachedSeasonRosters(seasonRecord.id),
    ]);
    const teams = allTeams.filter((t) => t.season_id === seasonRecord.id && !t.deleted_at && !t.is_bye);

    return (
        <TeamsPage
            season={seasonRecord}
            region={regionRecord}
            teams={teams}
            strengths={strengths.filter((s) => s.seasonId === seasonRecord.id)}
            rosters={rosters}
        />
    );
}
