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
        const {data, error} = await findActiveSeasonByRegion(supabase, regionId);

        if (error) {
            logger.error({regionId, error}, "Failed to fetch active season by region");
            return Err(serializeError(error, "DB_ERROR"));
        }

        if (!data) {
            return Err({
                message: "No active season found for region",
                code: "NOT_FOUND"
            });
        }

        return Ok(data);
    } catch (error) {
        logger.error({error}, "Unexpected error fetching active season by region");
        return Err(serializeError(error));
    }
}
