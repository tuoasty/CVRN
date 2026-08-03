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

export async function purgeCacheTagAction(input: unknown) {
    const parsed = PurgeTagSchema.safeParse(input);
    if (!parsed.success) {
        return Err(createError("Invalid cache tag", "VALIDATION_ERROR", 400));
    }

    const supabase = await createServerSupabase();
    const guard = await requireSuperAdmin(supabase);
    if (!guard.ok) return guard;

    revalidatePublicData([parsed.data.tag]);
    logger.info({tag: parsed.data.tag, userId: guard.value}, "Super admin purged cache tag");
    return Ok({tag: parsed.data.tag});
}

export async function purgeAllCacheAction() {
    const supabase = await createServerSupabase();
    const guard = await requireSuperAdmin(supabase);
    if (!guard.ok) return guard;

    revalidatePublicData();  
    logger.info({userId: guard.value}, "Super admin purged all cache tags");
    return Ok({tags: ALL_CACHE_TAGS});
}
