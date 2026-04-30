import {DBClient, PlayoffBracket} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {findPlayoffBracketsBySeasonId} from "@/server/db/playoff.repo";

export async function getPlayoffBracketBySeasonId(supabase: DBClient, seasonId: string): Promise<Result<PlayoffBracket[]>> {
    try {
        const result = await findPlayoffBracketsBySeasonId(supabase, seasonId);
        if (!result.ok) {
            logger.error({ error: result.error }, "Failed to fetch playoff bracket matches");
            return result;
        }
        return Ok(result.value);
    } catch (error) {
        logger.error({ error }, "Unexpected error fetching playoff brackets");
        return Err(serializeError(error));
    }
}
