/**
 * Cache tags for public data.
 *
 * Every cached public read registers one or more of these tags. Any mutation that
 * changes public data invalidates them via `revalidatePublicData()`
 * (server/cache/revalidate.ts) so the Full Route Cache refreshes immediately rather
 * than waiting out the 24h fallback TTL.
 *
 * Keep this list as the single source of truth — adding a tag here and using it in a
 * cached read is enough for the revalidation helper to pick it up.
 */
export const CACHE_TAGS = {
    regions: "regions",
    seasons: "seasons",
    teams: "teams",
    players: "players",
    standings: "standings",
    matches: "matches",
    playoffs: "playoffs",
    media: "media",
    // Per-player box-score data: the leaderboards. Separate from `matches` because
    // stats only ever change when a match sheet is synced, while `matches` churns on
    // every schedule edit, result entry and playoff advance. Sharing the tag meant the
    // two heaviest reads in the app were re-rendered by mutations that could not
    // possibly have changed them.
    stats: "stats",
} as const;

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];

export const ALL_CACHE_TAGS: CacheTag[] = Object.values(CACHE_TAGS);

/**
 * Fallback revalidation window (7 days) for cached public reads.
 *
 * This is a safety net, not the refresh mechanism. Public data changes on the daily
 * sheets cron and on admin mutations, and both invalidate by tag. If you find yourself
 * wanting to shorten this, the real fix is almost always a missing `revalidateTag` call
 * on whatever mutation went stale.
 *
 * It was 24h, which meant every entry expired roughly one cron cycle after the tag purge
 * that had already refreshed it — a second full re-render wave per day buying no extra
 * freshness. Each wave is thousands of ISR writes against a 200k monthly budget, which is
 * the tightest limit on the plan.
 *
 * Widening the window makes tags the sole refresh mechanism in practice, so the recovery
 * path matters more: /admin/cache purges any tag by hand, which is what covers the cases
 * tags cannot see (a migration redefining a view, direct SQL, a Supabase-side edit).
 */
export const PUBLIC_REVALIDATE_SECONDS = 604800;
