"use server"

import {z} from "zod";
import {revalidatePublicData} from "@/server/cache/revalidate";
import {ALL_CACHE_TAGS, CACHE_TAGS, type CacheTag} from "@/server/cache/tags";
import { requireGroups } from "@/server/domains/auth";
import {refreshRecords} from "@/server/domains/record";
import {Err, Ok} from "@/shared/types/result";
import {createServerSupabase} from "@/server/supabase/server";
import {createError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";

const PurgeTagSchema = z.object({
    tag: z.enum(ALL_CACHE_TAGS as [CacheTag, ...CacheTag[]]),
});

export async function purgeCacheTagAction(input: unknown) {
    const parsed = PurgeTagSchema.safeParse(input);
    if (!parsed.success) {
        return Err(createError("Invalid cache tag", "VALIDATION_ERROR", 400));
    }

    const supabase = await createServerSupabase();
    const guard = await requireGroups(supabase, ['super_admin'], { action: "purgeCacheTag", target: parsed.data });
    if (!guard.ok) return guard;

    if (parsed.data.tag === CACHE_TAGS.stats) {
        const refreshed = await refreshRecords(supabase);
        if (!refreshed.ok) return refreshed;
    }

    revalidatePublicData([parsed.data.tag]);
    logger.info({tag: parsed.data.tag, userId: guard.value.userId}, "Super admin purged cache tag");
    return Ok({tag: parsed.data.tag});
}

export async function purgeAllCacheAction() {
    const supabase = await createServerSupabase();
    const guard = await requireGroups(supabase, ['super_admin'], { action: "purgeAllCache" });
    if (!guard.ok) return guard;

    const refreshed = await refreshRecords(supabase);
    if (!refreshed.ok) return refreshed;

    revalidatePublicData();
    logger.info({userId: guard.value.userId}, "Super admin purged all cache tags");
    return Ok({tags: ALL_CACHE_TAGS});
}
