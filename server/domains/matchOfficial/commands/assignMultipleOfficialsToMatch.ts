import {DBClient, MatchOfficial} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {assignMultipleOfficials} from "@/server/db/matchOfficial.repo";
import {AssignMultipleOfficialsInput} from "../types";

export async function assignMultipleOfficialsToMatch(
    supabase: DBClient,
    p: AssignMultipleOfficialsInput
): Promise<Result<MatchOfficial[]>> {
    try {
        const result = await assignMultipleOfficials(
            supabase,
            p.matchId,
            p.officialIds,
            p.officialType
        );
        if (!result.ok) {
            logger.error({input: p, error: result.error}, "Failed to assign multiple officials to match");
            return result;
        }
        return Ok(result.value);
    } catch (error) {
        logger.error({error}, "Unexpected error assigning multiple officials to match");
        return Err(serializeError(error));
    }
}
