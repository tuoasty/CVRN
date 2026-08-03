import { notFound } from "next/navigation";
import PublicTeamDetailPage from "@/app/(public)/teams/[region]/[season]/[teamName]/PublicTeamDetailPage";
import {
    getCachedRegionByCode,
    getCachedSeasonBySlugAndRegion,
    getCachedTeamWithPlayers,
    getCachedTeamNameHistory,
} from "@/server/cache/publicReads";
import { safeDecodeURIComponent } from "@/app/utils/decodeURI";

type PageProps = {
    params: Promise<{
        region: string;
        season: string;
        teamName: string;
    }>;
};

export async function generateStaticParams() {
    return [];
}

export default async function TeamPage({ params }: PageProps) {
    const { region, season, teamName } = await params;

    const regionCode = safeDecodeURIComponent(region).toLowerCase();
    const seasonSlug = safeDecodeURIComponent(season).toLowerCase();
    const teamSlug = safeDecodeURIComponent(teamName).toLowerCase();

    const regionRecord = await getCachedRegionByCode(regionCode);
    if (!regionRecord) notFound();

    const seasonRecord = await getCachedSeasonBySlugAndRegion(seasonSlug, regionRecord.id);
    if (!seasonRecord) notFound();

    const teamData = await getCachedTeamWithPlayers(teamSlug, seasonRecord.id);
    if (!teamData) notFound();

    const history = await getCachedTeamNameHistory(teamData.team.id);

    return (
        <PublicTeamDetailPage
            team={teamData.team}
            players={teamData.players}
            history={history}
        />
    );
}
