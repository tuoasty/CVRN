import {DBClient} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {rpcReadvancePlayoffMatch} from "@/server/db/matches.repo";

export async function readvancePlayoffMatchService(
    supabase: DBClient,
    matchId: string
): Promise<Result<{ message: string }>> {
    try {
        const result = await rpcReadvancePlayoffMatch(supabase, matchId);
        if (!result.ok) {
            logger.error({matchId, error: result.error}, "Failed to re-advance playoff match");
            return result;
        }

        logger.info({matchId}, "Playoff match re-advanced successfully");

        return Ok({message: "Winner re-advanced into the next bracket"});
    } catch (error) {
        logger.error({error}, "Unexpected error re-advancing playoff match");
        return Err(serializeError(error));
    }
}
