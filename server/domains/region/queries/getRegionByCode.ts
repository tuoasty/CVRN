import {DBClient, Region} from "@/shared/types/db";
import {findRegionByCode} from "@/server/db/regions.repo";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError, SerializableError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";

export async function getRegionByCode(supabase: DBClient, code: string): Promise<Result<Region, SerializableError>> {
    try {
        const {data, error} = await findRegionByCode(supabase, code)
        if (error) {
            logger.error({code, error}, "Failed to fetch region by code");
            return Err(serializeError(error, "DB_ERROR"))
        }

        if (!data) {
            return Err({
                message: "Region not found",
                name: "NotFoundError",
                code: "NOT_FOUND"
            })
        }

        return Ok(data)
    } catch (error) {
        logger.error({error}, "Unexpected error fetching region by code");
        return Err(serializeError(error))
    }
}
