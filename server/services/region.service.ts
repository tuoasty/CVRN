import {DBClient, Region} from "@/shared/types/db";
import {findAllRegions, findRegionByCode} from "@/server/db/regions.repo";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError, SerializableError} from "@/server/utils/serializeableError";

export async function getAllRegions(supabase: DBClient): Promise<Result<Region[], SerializableError>> {
    try {
        const {data, error} = await findAllRegions(supabase)
        if (error) {
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
        return Err(serializeError(error))
    }
}

export async function getRegionByCode(supabase: DBClient, code: string): Promise<Result<Region, SerializableError>> {
    try {
        const {data, error} = await findRegionByCode(supabase, code)
        if (error) {
            return Err(serializeError(error))
        }

        if (!data) {
            return Err({
                message: "Region not found",
                name: "NotFoundError"
            })
        }

        return Ok(data)
    } catch (error) {
        return Err(serializeError(error))
    }
}