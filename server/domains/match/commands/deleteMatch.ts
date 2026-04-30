import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient} from "@/shared/types/db";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {findMatchById, deleteMatch} from "@/server/db/matches.repo";

export async function deleteMatchService(
    supabase: DBClient,
    matchId: string
): Promise<Result<void>> {
    try {
        const matchLookup = await findMatchById(supabase, matchId);
        if (!matchLookup.ok) {
            logger.error({ matchId, error: matchLookup.error }, "Failed to look up match");
            return matchLookup;
        }
        const match = matchLookup.value;
        if (!match) {
            logger.error({ matchId }, "Match not found");
            return Err({
                message: "Match not found",
                code: "NOT_FOUND"
            });
        }

        if (match.match_type === "playoffs") {
            return Err({
                message: "Playoff matches cannot be deleted",
                code: "VALIDATION_ERROR"
            });
        }

        if (match.status === "completed") {
            return Err({
                message: "Cannot delete completed matches",
                code: "VALIDATION_ERROR"
            });
        }

        const deleteResult = await deleteMatch(supabase, matchId);
        if (!deleteResult.ok) {
            logger.error({ matchId, error: deleteResult.error }, "Failed to delete match");
            return deleteResult;
        }

        logger.info({ matchId, seasonId: match.season_id, week: match.week }, "Match deleted successfully");
        return Ok(undefined);
    } catch (error) {
        logger.error({ error }, "Unexpected error deleting match");
        return Err(serializeError(error));
    }
}
