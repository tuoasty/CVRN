import "server-only";
import {revalidateTag} from "next/cache";
import {ALL_CACHE_TAGS, CACHE_TAGS, type CacheTag} from "./tags";
import {logger} from "@/server/utils/logger";

/**
 * Invalidate cached public data.
 *
 * Public reads are cached for 24h (server/cache/publicReads.ts), so that TTL is a
 * fallback, not the refresh mechanism — anything that mutates public data must call this
 * or the site serves stale pages for a day.
 *
 * Call sites are deliberately coarse. The tag set is small, the data changes a handful of
 * times a day, and a needless invalidation costs one re-render — while a *missed* one
 * shows wrong standings to every visitor until tomorrow. When unsure, invalidate more.
 *
 * Must be called from a Server Action or Route Handler. `revalidateTag` throws if invoked
 * during render or inside a cached function.
 *
 * Next 16 requires a cache-life profile as the second argument. "max" means the purge
 * marker itself never expires, so an invalidation can never be outlived by the entry it
 * is meant to clear — the conservative choice given our entries carry a 1y expire.
 *
 * Note: Next 16 also exposes `updateTag(tag)`, which adds read-your-own-writes semantics
 * (an admin would see their own edit immediately rather than on the next render). It is
 * only callable from Server Actions, so it cannot serve the cron path. If admin-side
 * staleness ever becomes a complaint, the fix is a Server-Action-only variant of this
 * helper that uses `updateTag`.
 */
export function revalidatePublicData(tags: CacheTag[] = ALL_CACHE_TAGS): void {
    for (const tag of tags) {
        revalidateTag(tag, "max");
    }
    logger.info({tags}, "Revalidated public cache tags");
}

/**
 * Tags touched by a sheet sync. Sheets drive rosters, match results and therefore
 * standings, so this is nearly everything — sync is the main way public data changes.
 */
export const SHEET_SYNC_TAGS: CacheTag[] = [
    CACHE_TAGS.teams,
    CACHE_TAGS.players,
    CACHE_TAGS.matches,
    CACHE_TAGS.standings,
    CACHE_TAGS.playoffs,
];
