import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient, Match} from "@/shared/types/db";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {findAllMatches} from "@/server/db/matches.repo";

export async function getAllMatches(supabase: DBClient): Promise<Result<Match[]>> {
    try {
        const {data, error} = await findAllMatches(supabase);

        if (error) {
            logger.error({error}, "Failed to fetch all matches");
            return Err(serializeError(error, "DB_ERROR"));
        }

        if (!data) {
            return Err({
                message: "Failed to fetch matches",
                code: "DB_ERROR"
            });
        }

        return Ok(data);
    } catch (error) {
        logger.error({error}, "Unexpected error fetching matches");
        return Err(serializeError(error));
    }
}
