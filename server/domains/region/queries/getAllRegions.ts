import {DBClient, Region} from "@/shared/types/db";
import {findAllRegions} from "@/server/db/regions.repo";
import {Err, Result} from "@/shared/types/result";
import {serializeError, SerializableError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";

export async function getAllRegions(supabase: DBClient): Promise<Result<Region[], SerializableError>> {
    try {
        const result = await findAllRegions(supabase);
        if (!result.ok) {
            logger.error({error: result.error}, "Failed to fetch all regions");
            return result;
        }
        return result;
    } catch (error) {
        logger.error({error}, "Unexpected error fetching all regions");
        return Err(serializeError(error));
    }
}
