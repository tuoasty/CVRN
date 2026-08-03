import {Suspense} from "react";
import AllTimeLeaderboardPage from "./AllTimeLeaderboardPage";
import {getCachedAllSeasonRows} from "@/server/cache/publicReads";

/**
 * All-time player leaderboard — career totals, one row per (player, region).
 *
 * The only public page that is not season-scoped, which is the point: it answers "who is
 * the best ever?" where the season board answers "who is best right now?".
 *
 * Ships PER-SEASON rows and sums them in the browser. A pre-aggregated view cannot serve
 * the season-cohort filter: once a region's seasons are added together, "S1 and S2 only"
 * is unrecoverable. Region, season and search are therefore all client-side, which also
 * keeps this route statically renderable — reading `searchParams` to narrow it would make
 * the largest read in the app dynamic and cost a round trip per chip click. Same
 * reasoning as the season route, which documents it at length.
 */
export default async function Page() {
    const rows = await getCachedAllSeasonRows();

    return (
        <Suspense fallback={null}>
            <AllTimeLeaderboardPage rows={rows} />
        </Suspense>
    );
}
