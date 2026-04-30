import {DBClient, Season} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {findSeasonsByRegion} from "@/server/db/seasons.repo";

export async function getSeasonsByRegion(
    supabase: DBClient,
    regionId: string
): Promise<Result<Season[]>> {
    try {
        const result = await findSeasonsByRegion(supabase, regionId);
        if (!result.ok) {
            logger.error({regionId, error: result.error}, "Failed to fetch seasons by region");
            return result;
        }
        return Ok(result.value);
    } catch (error) {
        logger.error({error}, "Unexpected error fetching seasons by region");
        return Err(serializeError(error));
    }
}
