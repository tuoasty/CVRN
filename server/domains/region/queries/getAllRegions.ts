import {DBClient, Region} from "@/shared/types/db";
import {findAllRegions} from "@/server/db/regions.repo";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError, SerializableError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";

export async function getAllRegions(supabase: DBClient): Promise<Result<Region[], SerializableError>> {
    try {
        const {data, error} = await findAllRegions(supabase)
        if (error) {
            logger.error({error}, "Failed to fetch all regions");
            return Err(serializeError(error))
        }

        if (!data) {
            return Err({
                message: "Failed to fetch regions",
                name: "FetchError"
            })
        }

        return Ok(data)
    } catch (error) {
        logger.error({error}, "Unexpected error fetching all regions");
        return Err(serializeError(error))
    }
}
