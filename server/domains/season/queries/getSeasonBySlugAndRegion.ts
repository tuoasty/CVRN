import {DBClient} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {findSeasonBySlugAndRegion} from "@/server/db/seasons.repo";
import {SeasonWithPlayoffConfig} from "../types";

export async function getSeasonBySlugAndRegion(
    supabase: DBClient,
    slug: string,
    regionId: string
): Promise<Result<SeasonWithPlayoffConfig>> {
    try {
        const result = await findSeasonBySlugAndRegion(supabase, slug, regionId);
        if (!result.ok) {
            logger.error({slug, regionId, error: result.error}, "Failed to fetch season by slug and region");
            return result;
        }
        if (!result.value) {
            return Err({
                message: "Season not found",
                code: "NOT_FOUND"
            });
        }
        return Ok(result.value as SeasonWithPlayoffConfig);
    } catch (error) {
        logger.error({error}, "Unexpected error fetching season by slug and region");
        return Err(serializeError(error));
    }
}
