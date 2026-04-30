import {DBClient} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {findSeasonById, deleteSeasonById} from "@/server/db/seasons.repo";
import {SeasonIdInput} from "../types";

export async function deleteSeason(
    supabase: DBClient,
    p: SeasonIdInput
): Promise<Result<void>> {
    try {
        const lookup = await findSeasonById(supabase, p.seasonId);
        if (!lookup.ok) {
            logger.error({seasonId: p.seasonId, error: lookup.error}, "Failed to look up season");
            return lookup;
        }
        if (!lookup.value) {
            logger.warn({seasonId: p.seasonId}, "Attempted to delete non-existent season");
            return Err({
                message: "Season does not exist",
                code: "NOT_FOUND"
            });
        }

        const deleteResult = await deleteSeasonById(supabase, p.seasonId);
        if (!deleteResult.ok) {
            logger.error({seasonId: p.seasonId, error: deleteResult.error}, "Failed to delete season");
            return deleteResult;
        }
        return Ok(undefined);
    } catch (error) {
        logger.error({error}, "Unexpected error deleting season");
        return Err(serializeError(error));
    }
}
