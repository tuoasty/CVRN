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
        const {data, error} = await findSeasonsByRegion(supabase, regionId);

        if (error) {
            logger.error({regionId, error}, "Failed to fetch seasons by region");
            return Err(serializeError(error));
        }

        if (!data) {
            return Err({
                message: "Failed to fetch seasons",
                name: "FetchError"
            });
        }

        return Ok(data);
    } catch (error) {
        logger.error({error}, "Unexpected error fetching seasons by region");
        return Err(serializeError(error));
    }
}
