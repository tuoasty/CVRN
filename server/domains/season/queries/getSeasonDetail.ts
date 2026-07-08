import {DBClient} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {findSeasonHistoryBySlugAndRegion} from "@/server/db/seasonHistory.repo";
import {SeasonDetail} from "../types";
import { findRegionByCode } from "@/server/db/regions.repo";

export async function getSeasonHistoryDetail(
    supabase: DBClient,
    slug: string,
    regionCode: string
): Promise<Result<SeasonDetail>> {
    try {
        const regionRes = await findRegionByCode(supabase, regionCode);
        if (!regionRes.ok) return regionRes;
        if (!regionRes.value) return Err({message: "Region not found", code: "NOT_FOUND"});

        const result = await findSeasonHistoryBySlugAndRegion(supabase, slug, regionRes.value.id);
        if (!result.ok) {
            logger.error({error: result.error, slug}, "Failed to fetch season detail");
            return result as Result<SeasonDetail>;
        }
        return Ok(result.value as SeasonDetail);
    } catch (error) {
        logger.error({error, slug}, "Unexpected error fetching season detail");
        return Err(serializeError(error));
    }
}
