import {Err, Result} from "@/shared/types/result";
import {DBClient, RangedSeasonStatRow} from "@/shared/types/db";
import {findRangedPlayerLeaderboard} from "@/server/db/playerMatchStats.repo";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";

export async function getRangedLeaderboardStatRows(
    supabase: DBClient,
    p: {seasonId: string; from: string; to: string}
): Promise<Result<RangedSeasonStatRow[]>> {
    try {
        const result = await findRangedPlayerLeaderboard(supabase, p);
        if (!result.ok) {
            logger.error({seasonId: p.seasonId, error: result.error}, "Failed to fetch ranged leaderboard stat rows");
        }
        return result;
    } catch (error) {
        logger.error({error, seasonId: p.seasonId}, "Unexpected error in getRangedLeaderboardStatRows");
        return Err(serializeError(error));
    }
}
