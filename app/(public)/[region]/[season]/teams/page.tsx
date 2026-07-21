import { notFound } from "next/navigation";
import TeamsPage from "@/app/(public)/teams/TeamsPage";
import {
    getCachedRegionByCode,
    getCachedSeasonBySlugAndRegion,
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

    const allTeams = await getCachedTeamsWithRegions();
    const teams = allTeams.filter((t) => t.season_id === seasonRecord.id && !t.deleted_at);

    return <TeamsPage season={seasonRecord} region={regionRecord} teams={teams} />;
}
