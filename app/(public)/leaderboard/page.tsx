import {Suspense} from "react";
import AllTimeLeaderboardPage from "./AllTimeLeaderboardPage";
import {getCachedAllSeasonRows} from "@/server/cache/publicReads";

export default async function Page() {
    const rows = await getCachedAllSeasonRows();

    return (
        <Suspense fallback={null}>
            <AllTimeLeaderboardPage rows={rows} />
        </Suspense>
    );
}
