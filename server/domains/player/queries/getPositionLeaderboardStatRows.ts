import {Err, Result} from "@/shared/types/result";
import {DBClient, RangedSeasonStatRow} from "@/shared/types/db";
import {findPlayerLeaderboardByPosition} from "@/server/db/playerMatchStats.repo";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";

export async function getPositionLeaderboardStatRows(
    supabase: DBClient,
    p: {seasonId: string; position: string}
): Promise<Result<RangedSeasonStatRow[]>> {
    try {
        const result = await findPlayerLeaderboardByPosition(supabase, p);
        if (!result.ok) {
            logger.error(
                {seasonId: p.seasonId, position: p.position, error: result.error},
                "Failed to fetch position leaderboard stat rows"
            );
        }
        return result;
    } catch (error) {
        logger.error(
            {error, seasonId: p.seasonId, position: p.position},
            "Unexpected error in getPositionLeaderboardStatRows"
        );
        return Err(serializeError(error));
    }
}
