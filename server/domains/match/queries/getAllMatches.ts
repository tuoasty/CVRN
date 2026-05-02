import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient, Match} from "@/shared/types/db";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {findAllMatches} from "@/server/db/matches.repo";

export async function getAllMatches(supabase: DBClient): Promise<Result<Match[]>> {
    try {
        const result = await findAllMatches(supabase);
        if (!result.ok) {
            logger.error({error: result.error}, "Failed to fetch all matches");
            return result;
        }
        return Ok(result.value);
    } catch (error) {
        logger.error({error}, "Unexpected error fetching matches");
        return Err(serializeError(error));
    }
}
