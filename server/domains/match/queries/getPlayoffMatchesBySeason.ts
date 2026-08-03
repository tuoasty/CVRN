import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient, Match} from "@/shared/types/db";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {findPlayoffMatchesFullBySeason} from "@/server/db/matches.repo";

export async function getPlayoffMatchesBySeason(
    supabase: DBClient,
    seasonId: string
): Promise<Result<Match[]>> {
    try {
        const result = await findPlayoffMatchesFullBySeason(supabase, seasonId);
        if (!result.ok) {
            logger.error({seasonId, error: result.error}, "Failed to fetch playoff matches");
            return result;
        }
        return Ok(result.value);
    } catch (error) {
        logger.error({seasonId, error}, "Unexpected error fetching playoff matches");
        return Err(serializeError(error));
    }
}
