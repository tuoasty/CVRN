import {DBClient, PlayoffConfig} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {findAllPlayoffConfigs} from "@/server/db/playoff.repo";

export async function getAllPlayoffConfigs(supabase: DBClient): Promise<Result<PlayoffConfig[]>> {
    try {
        const result = await findAllPlayoffConfigs(supabase);
        if (!result.ok) {
            logger.error({error: result.error}, "Failed to fetch playoff configs");
            return result;
        }
        return Ok(result.value);
    } catch (error) {
        logger.error({error}, "Unexpected error fetching playoff configs");
        return Err(serializeError(error));
    }
}
