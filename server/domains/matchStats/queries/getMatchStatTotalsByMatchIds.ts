import {Err, Result} from "@/shared/types/result";
import {DBClient, PlayerMatchStatTotal} from "@/shared/types/db";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {findMatchStatTotalsByMatchIds} from "@/server/db/playerMatchStats.repo";

export async function getMatchStatTotalsByMatchIds(
    supabase: DBClient,
    matchIds: string[]
): Promise<Result<PlayerMatchStatTotal[]>> {
    try {
        const result = await findMatchStatTotalsByMatchIds(supabase, matchIds);
        if (!result.ok) {
            logger.error({count: matchIds.length, error: result.error}, "Failed to fetch match stat totals");
        }
        return result;
    } catch (error) {
        logger.error({error}, "Unexpected error fetching match stat totals");
        return Err(serializeError(error));
    }
}
