import { notFound } from "next/navigation";
import PlayoffsPage from "@/app/(public)/playoffs/PlayoffsPage";
import {
    getCachedRegionByCode,
    getCachedSeasonBySlugAndRegion,
    getCachedPlayoffBrackets,
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

    // Skip the query entirely when playoffs have not started — the page renders an empty
    // state in that case and never touches brackets.
    const brackets = seasonRecord.playoff_started
        ? await getCachedPlayoffBrackets(seasonRecord.id)
        : [];

    return <PlayoffsPage brackets={brackets} />;
}
