import {DBClient, MatchOfficial} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {assignOfficial} from "@/server/db/matchOfficial.repo";
import {AssignOfficialInput} from "../types";

export async function assignOfficialToMatch(
    supabase: DBClient,
    p: AssignOfficialInput
): Promise<Result<MatchOfficial>> {
    try {
        const result = await assignOfficial(supabase, p);
        if (!result.ok) {
            logger.error({input: p, error: result.error}, "Failed to assign official to match");
            return result;
        }
        return Ok(result.value);
    } catch (error) {
        logger.error({error}, "Unexpected error assigning official to match");
        return Err(serializeError(error));
    }
}
