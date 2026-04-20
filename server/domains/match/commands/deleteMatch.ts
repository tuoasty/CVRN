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
        const { data: match, error: matchError } = await findMatchById(supabase, matchId);

        if (matchError || !match) {
            logger.error({ matchId, error: matchError }, "Match not found");
            return Err({
                name: "NotFoundError",
                message: "Match not found",
                code: "NOT_FOUND"
            });
        }

        if (match.match_type === "playoffs") {
            return Err({
                name: "ValidationError",
                message: "Playoff matches cannot be deleted",
                code: "VALIDATION_ERROR"
            });
        }

        if (match.status === "completed") {
            return Err({
                name: "ValidationError",
                message: "Cannot delete completed matches",
                code: "VALIDATION_ERROR"
            });
        }

        const { error: deleteError } = await deleteMatch(supabase, matchId);

        if (deleteError) {
            logger.error({ matchId, error: deleteError }, "Failed to delete match");
            return Err(serializeError(deleteError, "DB_ERROR"));
        }

        logger.info({ matchId, seasonId: match.season_id, week: match.week }, "Match deleted successfully");
        return Ok(undefined);
    } catch (error) {
        logger.error({ error }, "Unexpected error deleting match");
        return Err(serializeError(error));
    }
}
