import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient, MatchSet} from "@/shared/types/db";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {findMatchSets} from "@/server/db/matches.repo";
import {MatchSetsInput} from "../types";

export async function getMatchSets(
    supabase: DBClient,
    p: MatchSetsInput
): Promise<Result<MatchSet[]>> {
    try {
        const result = await findMatchSets(supabase, p.matchId);
        if (!result.ok) {
            logger.error({matchId: p.matchId, error: result.error}, "Failed to fetch match sets");
            return result;
        }
        return Ok(result.value);
    } catch (error) {
        logger.error({error}, "Unexpected error fetching match sets");
        return Err(serializeError(error));
    }
}
