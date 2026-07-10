import {DBClient} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {deletePlayoffMatchesBySeasonId, updateSeasonPlayoffStatus} from "@/server/db/playoff.repo";
import {findSeasonById} from "@/server/db/seasons.repo";

export async function resetPlayoffBracketsService(
    supabase: DBClient,
    seasonId: string
): Promise<Result<{ message: string }>> {
    try {
        const seasonResult = await findSeasonById(supabase, seasonId);
        if (!seasonResult.ok) {
            logger.error({ seasonId, error: seasonResult.error }, "Failed to look up season");
            return seasonResult;
        }
        const season = seasonResult.value;
        if (!season) {
            logger.error({ seasonId }, "Season not found");
            return Err({
                message: "Season not found",
                code: "NOT_FOUND"
            });
        }

        if (!season.playoff_started) {
            return Err({
                message: "Playoffs have not been started for this season",
                code: "VALIDATION_ERROR"
            });
        }

        // Completed matches no longer block the reset — the admin UI confirms first.
        // The delete cascades to match_sets, match_officials, player_match_stats and
        // playoff_brackets, so completed results are destroyed along with the bracket.
        const deleteResult = await deletePlayoffMatchesBySeasonId(supabase, seasonId);
        if (!deleteResult.ok) {
            logger.error({ seasonId, error: deleteResult.error }, "Failed to delete playoff matches");
            return deleteResult;
        }

        const updateResult = await updateSeasonPlayoffStatus(supabase, seasonId, {
            playoffStarted: false
        });
        if (!updateResult.ok) {
            logger.error({ seasonId, error: updateResult.error }, "Failed to update season playoff status");
            return updateResult;
        }

        logger.info({ seasonId }, "Playoff brackets reset successfully");

        return Ok({
            message: "Playoff brackets reset successfully"
        });
    } catch (error) {
        logger.error({ error }, "Unexpected error resetting playoff brackets");
        return Err(serializeError(error));
    }
}
