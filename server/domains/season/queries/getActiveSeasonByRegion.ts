import {DBClient, Season} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {findActiveSeasonByRegion} from "@/server/db/seasons.repo";

export async function getActiveSeasonByRegion(
    supabase: DBClient,
    regionId: string
): Promise<Result<Season>> {
    try {
        const result = await findActiveSeasonByRegion(supabase, regionId);
        if (!result.ok) {
            logger.error({regionId, error: result.error}, "Failed to fetch active season by region");
            return result;
        }
        if (!result.value) {
            return Err({
                message: "No active season found for region",
                code: "NOT_FOUND"
            });
        }
        return Ok(result.value);
    } catch (error) {
        logger.error({error}, "Unexpected error fetching active season by region");
        return Err(serializeError(error));
    }
}
