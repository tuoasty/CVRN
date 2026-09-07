import "server-only";
import {DBClient} from "@/shared/types/db";
import {createPublicClient} from "@/server/supabase/server-public";
import {logger} from "@/server/utils/logger";
import type {CacheTag} from "./tags";

export async function bumpCacheVersion(supabase: DBClient, tags: CacheTag[]): Promise<void> {
    for (const tag of tags) {
        const {error} = await supabase.rpc("bump_cache_version", {p_tag: tag});
        if (error) logger.error({error, tag}, "bumpCacheVersion failed");
    }
}

export async function getCacheVersion(tag: CacheTag): Promise<number> {
    const {data, error} = await createPublicClient()
        .from("cache_versions")
        .select("version")
        .eq("tag", tag)
        .maybeSingle();

    if (error) {
        logger.error({error, tag}, "getCacheVersion failed");
        return 0;
    }
    return Number(data?.version ?? 0);
}
