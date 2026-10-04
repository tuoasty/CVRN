import {DBClient} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {clearAllStarCaptain, findSeasonAwardAllStarRef, updateAllStarCaptain} from "@/server/db/seasonHistory.repo";
import {SetAllStarCaptainInput} from "../types";

export async function setAllStarCaptain(
    supabase: DBClient,
    p: SetAllStarCaptainInput
): Promise<Result<true>> {
    try {
        const refRes = await findSeasonAwardAllStarRef(supabase, p.awardId);
        if (!refRes.ok) return refRes;
        const ref = refRes.value;
        if (!ref) return Err({message: "Award not found", code: "NOT_FOUND"});
        if (!ref.all_star_team || ref.all_star_slot !== "starter") {
            return Err({message: "Only All-Star starters can be captain", code: "VALIDATION_ERROR"});
        }

        if (p.isCaptain) {
            const clearRes = await clearAllStarCaptain(supabase, ref.season_id, ref.all_star_team);
            if (!clearRes.ok) {
                logger.error({input: p, error: clearRes.error}, "Failed to clear previous all-star captain");
                return clearRes;
            }
        }

        const result = await updateAllStarCaptain(supabase, p.awardId, p.isCaptain);
        if (!result.ok) {
            logger.error({input: p, error: result.error}, "Failed to set all-star captain");
            return result;
        }
        return Ok(true);
    } catch (error) {
        logger.error({error}, "Unexpected error setting all-star captain");
        return Err(serializeError(error));
    }
}
