import {Suspense} from "react";
import AllTimeLeaderboardPage from "./AllTimeLeaderboardPage";
import {getCachedAllSeasonRows, getCachedLeaderboardIdentity} from "@/server/cache/publicReads";
import {joinLeaderboardIdentity} from "@/app/features/leaderboard/joinLeaderboardIdentity";

export default async function Page() {
    const [statRows, identity] = await Promise.all([
        getCachedAllSeasonRows(),
        getCachedLeaderboardIdentity(),
    ]);

    return (
        <Suspense fallback={null}>
            <AllTimeLeaderboardPage rows={joinLeaderboardIdentity(statRows, identity)} />
        </Suspense>
    );
}
