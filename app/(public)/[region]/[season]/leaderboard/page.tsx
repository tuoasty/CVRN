import { Suspense } from "react";
import { notFound } from "next/navigation";
import LeaderboardPage from "@/app/(public)/leaderboard/LeaderboardPage";
import {
    getCachedRegionByCode,
    getCachedSeasonBySlugAndRegion,
    getCachedPlayerLeaderboard,
} from "@/server/cache/publicReads";
import { safeDecodeURIComponent } from "@/app/utils/decodeURI";

type PageProps = {
    params: Promise<{ region: string; season: string }>;
};

/**
 * Season-scoped player leaderboard.
 *
 * Rows ship with the HTML rather than through the SWR hook this page used to call: that
 * hook went through a server action, which meant a cookie-bound client and an uncacheable
 * POST for the heaviest read in the app.
 *
 * `searchParams` is deliberately NOT read here, unlike the matches route. View and sort
 * are pure presentation over a row set that never changes, so resolving them on the server
 * would cost a round trip per sort click and make the route dynamic — for a board whose
 * one static entry per (region, season) is exactly what should be cached.
 */
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

    const rows = await getCachedPlayerLeaderboard(seasonRecord.id);

    return (
        <Suspense fallback={null}>
            <LeaderboardPage rows={rows} season={seasonRecord} region={regionRecord} />
        </Suspense>
    );
}
