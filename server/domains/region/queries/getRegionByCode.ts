import {DBClient, Region} from "@/shared/types/db";
import {findRegionByCode} from "@/server/db/regions.repo";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError, SerializableError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";

export async function getRegionByCode(supabase: DBClient, code: string): Promise<Result<Region, SerializableError>> {
    try {
        const result = await findRegionByCode(supabase, code);
        if (!result.ok) {
            logger.error({code, error: result.error}, "Failed to fetch region by code");
            return result;
        }

        if (!result.value) {
            return Err({message: "Region not found", code: "NOT_FOUND"});
        }

        return Ok(result.value);
    } catch (error) {
        logger.error({error}, "Unexpected error fetching region by code");
        return Err(serializeError(error));
    }
}
