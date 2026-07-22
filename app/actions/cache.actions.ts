"use server"

import {z} from "zod";
import {revalidatePublicData} from "@/server/cache/revalidate";
import {ALL_CACHE_TAGS, type CacheTag} from "@/server/cache/tags";
import {requireSuperAdmin} from "@/server/domains/auth";
import {Err, Ok} from "@/shared/types/result";
import {createServerSupabase} from "@/server/supabase/server";
import {createError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";

const PurgeTagSchema = z.object({
    tag: z.enum(ALL_CACHE_TAGS as [CacheTag, ...CacheTag[]]),
});

/**
 * Manual cache invalidation for the admin cache page.
 *
 * The tag system assumes public data only ever changes through an app mutation. That
 * breaks for anything that changes rows underneath the app — a migration that redefines a
 * view, direct SQL, a Supabase-side edit — and there is otherwise no way to clear a tag
 * short of waiting out the fallback TTL. On Vercel a redeploy does not help: the Full Route
 * Cache clears per deployment but `unstable_cache` lives in the Data Cache, which persists.
 *
 * These are thin authenticated wrappers. `revalidatePublicData` already logs and already
 * calls `revalidateTag(tag, "max")`; no new cache primitives are involved.
 */
export async function purgeCacheTagAction(input: unknown) {
    const parsed = PurgeTagSchema.safeParse(input);
    if (!parsed.success) {
        return Err(createError("Invalid cache tag", "VALIDATION_ERROR", 400));
    }

    const supabase = await createServerSupabase();
    const {data: {user}} = await supabase.auth.getUser();
    if (!user) return Err(createError("Unauthorized", "UNAUTHORIZED", 401));

    revalidatePublicData([parsed.data.tag]);
    logger.info({tag: parsed.data.tag, userId: user.id}, "Admin purged cache tag");
    return Ok({tag: parsed.data.tag});
}

/**
 * super_admin only, unlike the per-tag purge above.
 *
 * This clears all eight tags, which re-renders essentially every cached page — on the order
 * of a few thousand ISR writes against a 200k monthly budget. That is a real cost per press,
 * not the "handful of extra DB reads" it would be on an unmetered host, so it follows the
 * same guard as the other batch-destructive actions in this codebase.
 */
export async function purgeAllCacheAction() {
    const supabase = await createServerSupabase();
    const guard = await requireSuperAdmin(supabase);
    if (!guard.ok) return guard;

    revalidatePublicData();  // defaults to ALL_CACHE_TAGS
    logger.info({userId: guard.value}, "Admin purged all cache tags");
    return Ok({tags: ALL_CACHE_TAGS});
}
