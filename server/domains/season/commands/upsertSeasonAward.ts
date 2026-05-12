import {DBClient} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {insertSeasonAward} from "@/server/db/seasonHistory.repo";
import {UpsertSeasonAwardInput} from "../types";

export async function upsertSeasonAward(
    supabase: DBClient,
    p: UpsertSeasonAwardInput,
    createdBy: string
): Promise<Result<true>> {
    try {
        const result = await insertSeasonAward(supabase, {
            seasonId: p.seasonId,
            playerId: p.playerId,
            awardName: p.awardName,
            createdBy,
        });
        if (!result.ok) {
            logger.error({input: p, error: result.error}, "Failed to insert season award");
            return result;
        }
        return Ok(true);
    } catch (error) {
        logger.error({error}, "Unexpected error inserting season award");
        return Err(serializeError(error));
    }
}
