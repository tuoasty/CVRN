import {Suspense} from "react";
import AllTimeLeaderboardPage from "./AllTimeLeaderboardPage";
import {getCachedAllSeasonRows, getCachedLeaderboardIdentity} from "@/server/cache/publicReads";
import {getCacheVersion} from "@/server/cache/version";
import {CACHE_TAGS} from "@/server/cache/tags";
import {joinLeaderboardIdentity} from "@/app/features/leaderboard/joinLeaderboardIdentity";

export default async function Page() {
    const [statRows, identity, statsVersion] = await Promise.all([
        getCachedAllSeasonRows(),
        getCachedLeaderboardIdentity(),
        getCacheVersion(CACHE_TAGS.stats),
    ]);

    return (
        <Suspense fallback={null}>
            <AllTimeLeaderboardPage
                rows={joinLeaderboardIdentity(statRows, identity)}
                statsVersion={statsVersion}
            />
        </Suspense>
    );
}
