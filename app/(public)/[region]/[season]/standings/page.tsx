import { notFound } from "next/navigation";
import StandingsPage from "@/app/(public)/standings/StandingsPage";
import {
    getCachedRegionByCode,
    getCachedSeasonBySlugAndRegion,
    getCachedStandings,
} from "@/server/cache/publicReads";
import { safeDecodeURIComponent } from "@/app/utils/decodeURI";

type PageProps = {
    params: Promise<{ region: string; season: string }>;
};

export default async function Page({ params }: PageProps) {
    const { region, season } = await params;

    // The parent layout resolves these too, but its result lives in a client context that
    // a server component cannot read. Both calls hit the same cache entries, so the repeat
    // lookup costs nothing.
    const regionRecord = await getCachedRegionByCode(safeDecodeURIComponent(region).toLowerCase());
    if (!regionRecord) notFound();

    const seasonRecord = await getCachedSeasonBySlugAndRegion(
        safeDecodeURIComponent(season).toLowerCase(),
        regionRecord.id,
    );
    if (!seasonRecord) notFound();

    const standings = await getCachedStandings(seasonRecord.id, regionRecord.id);

    return <StandingsPage season={seasonRecord} region={regionRecord} standings={standings} />;
}
