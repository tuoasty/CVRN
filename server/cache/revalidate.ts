import "server-only";
import {revalidateTag} from "next/cache";
import {ALL_CACHE_TAGS, CACHE_TAGS, type CacheTag} from "./tags";
import {logger} from "@/server/utils/logger";

export function revalidatePublicData(tags: CacheTag[] = ALL_CACHE_TAGS): void {
    for (const tag of tags) {
        revalidateTag(tag, "max");
    }
    logger.info({tags}, "Revalidated public cache tags");
}

export const SHEET_SYNC_TAGS: CacheTag[] = [
    CACHE_TAGS.teams,
    CACHE_TAGS.players,
    CACHE_TAGS.matches,
    CACHE_TAGS.standings,
    CACHE_TAGS.playoffs,
];
