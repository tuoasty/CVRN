import {DBClient} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {deleteSeasonAwardById} from "@/server/db/seasonHistory.repo";
import {DeleteSeasonAwardInput} from "../types";

export async function deleteSeasonAward(
    supabase: DBClient,
    p: DeleteSeasonAwardInput
): Promise<Result<true>> {
    try {
        const result = await deleteSeasonAwardById(supabase, p.awardId);
        if (!result.ok) {
            logger.error({input: p, error: result.error}, "Failed to delete season award");
            return result;
        }
        return Ok(true);
    } catch (error) {
        logger.error({error}, "Unexpected error deleting season award");
        return Err(serializeError(error));
    }
}
