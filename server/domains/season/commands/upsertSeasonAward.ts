import {DBClient} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {insertSeasonAward} from "@/server/db/seasonHistory.repo";
import {storeAwardAvatar} from "./storeAwardAvatar";
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
            category: p.category,
            createdBy,
        });
        if (!result.ok) {
            logger.error({input: p, error: result.error}, "Failed to insert season award");
            return result;
        }

        const storeResult = await storeAwardAvatar(result.value.id, p.cdnUrl);
        if (!storeResult.ok) {
            logger.error({awardId: result.value.id, error: storeResult.error}, "Failed to store award avatar");
            return Err(storeResult.error);
        }

        return Ok(true);
    } catch (error) {
        logger.error({error}, "Unexpected error inserting season award");
        return Err(serializeError(error));
    }
}
