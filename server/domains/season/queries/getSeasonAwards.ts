import {DBClient} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {findSeasonAwards} from "@/server/db/seasonHistory.repo";
import {SeasonAwardEntryWithPlayer} from "../types";

export async function getSeasonAwards(
    supabase: DBClient,
    seasonId: string
): Promise<Result<SeasonAwardEntryWithPlayer[]>> {
    try {
        const result = await findSeasonAwards(supabase, seasonId);
        if (!result.ok) {
            logger.error({seasonId, error: result.error}, "Failed to fetch season awards");
            return result;
        }
        return Ok(result.value as unknown as SeasonAwardEntryWithPlayer[]);
    } catch (error) {
        logger.error({error}, "Unexpected error fetching season awards");
        return Err(serializeError(error));
    }
}
