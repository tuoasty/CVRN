import {getSupabaseAdmin} from "@/server/supabase/admin";
import {isValidBearerSecret} from "@/server/utils/apiAuth";
import {toApiResponse} from "@/server/utils/apiResponse";
import {DEFAULT_MAX_RESOLVES, syncBoosters} from "@/server/domains/booster";
import {revalidatePublicData} from "@/server/cache/revalidate";
import {CACHE_TAGS} from "@/server/cache/tags";
import {logger} from "@/server/utils/logger";
import type {DBClient} from "@/shared/types/db";

const log = logger.child({module: "cron/sync-boosters"});

const MAX_RESOLVES_CEILING = 200;

export async function GET(req: Request) {
    if (!isValidBearerSecret(req.headers.get("authorization"), process.env.CRON_SECRET)) {
        log.warn("Cron request rejected: invalid or missing CRON_SECRET");
        return new Response("Unauthorized", {status: 401});
    }

    const limitParam = Number(new URL(req.url).searchParams.get("limit"));
    const maxResolves = Number.isInteger(limitParam) && limitParam > 0
        ? Math.min(limitParam, MAX_RESOLVES_CEILING)
        : DEFAULT_MAX_RESOLVES;

    const result = await syncBoosters(getSupabaseAdmin() as unknown as DBClient, {maxResolves});
    if (result.ok && result.value.changed) revalidatePublicData([CACHE_TAGS.boosters]);
    return toApiResponse(result);
}
