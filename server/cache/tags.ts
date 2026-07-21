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
} as const;

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];

export const ALL_CACHE_TAGS: CacheTag[] = Object.values(CACHE_TAGS);

/**
 * Fallback revalidation window (24h) for cached public reads.
 *
 * This is a safety net, not the refresh mechanism. Public data changes on the daily
 * sheets cron and on admin mutations, and both invalidate by tag. If you find yourself
 * wanting to shorten this, the real fix is almost always a missing `revalidateTag` call
 * on whatever mutation went stale.
 */
export const PUBLIC_REVALIDATE_SECONDS = 86400;
