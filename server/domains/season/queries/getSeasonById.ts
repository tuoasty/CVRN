import {DBClient, Season} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {findSeasonById} from "@/server/db/seasons.repo";
import {SeasonIdInput} from "../types";

export async function getSeasonById(
    supabase: DBClient,
    p: SeasonIdInput
): Promise<Result<Season>> {
    try {
        const result = await findSeasonById(supabase, p.seasonId);
        if (!result.ok) {
            logger.error({seasonId: p.seasonId, error: result.error}, "Failed to fetch season by id");
            return result;
        }
        if (!result.value) {
            return Err({
                message: "Season not found",
                code: "NOT_FOUND"
            });
        }
        return Ok(result.value);
    } catch (error) {
        logger.error({error}, "Unexpected error fetching season by id");
        return Err(serializeError(error));
    }
}
