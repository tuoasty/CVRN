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
        const { data: season, error: seasonError } = await findSeasonById(supabase, seasonId);

        if (seasonError || !season) {
            logger.error({ seasonId, error: seasonError }, "Season not found");
            return Err({
                name: "NotFoundError",
                message: "Season not found"
            });
        }

        if (!season.playoff_started) {
            return Err({
                name: "ValidationError",
                message: "Playoffs have not been started for this season"
            });
        }

        const { data: playoffMatches, error: matchesError } = await supabase
            .from("matches")
            .select("id, status")
            .eq("season_id", seasonId)
            .eq("match_type", "playoffs");

        if (matchesError) {
            logger.error({ seasonId, error: matchesError }, "Failed to fetch playoff matches");
            return Err(serializeError(matchesError));
        }

        const hasCompletedMatches = playoffMatches?.some(m => m.status === "completed");

        if (hasCompletedMatches) {
            return Err({
                name: "ValidationError",
                message: "Cannot reset brackets - some playoff matches have been completed"
            });
        }

        const { error: deleteError } = await deletePlayoffMatchesBySeasonId(supabase, seasonId);

        if (deleteError) {
            logger.error({ seasonId, error: deleteError }, "Failed to delete playoff matches");
            return Err(serializeError(deleteError));
        }

        const { error: updateError } = await updateSeasonPlayoffStatus(supabase, seasonId, {
            playoffStarted: false
        });

        if (updateError) {
            logger.error({ seasonId, error: updateError }, "Failed to update season playoff status");
            return Err(serializeError(updateError));
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
