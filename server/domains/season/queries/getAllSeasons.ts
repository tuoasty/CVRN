import {DBClient} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {findAllSeasons} from "@/server/db/seasons.repo";
import {SeasonWithPlayoffConfig} from "../types";

export async function getAllSeasons(
    supabase: DBClient
): Promise<Result<SeasonWithPlayoffConfig[]>> {
    try {
        const result = await findAllSeasons(supabase);
        if (!result.ok) {
            logger.error({error: result.error}, "Failed to fetch all seasons");
            return result;
        }
        return Ok(result.value as SeasonWithPlayoffConfig[]);
    } catch (error) {
        logger.error({error}, "Unexpected error fetching all seasons");
        return Err(serializeError(error));
    }
}
