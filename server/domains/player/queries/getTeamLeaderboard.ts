import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient} from "@/shared/types/db";
import {PlayerLeaderboardRow} from "../types";
import {findPlayerLeaderboard} from "@/server/db/playerMatchStats.repo";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";

export async function getTeamLeaderboard(
    supabase: DBClient,
    p: {seasonId: string; teamId: string}
): Promise<Result<PlayerLeaderboardRow[]>> {
    try {
        const result = await findPlayerLeaderboard(supabase, p);
        if (!result.ok) {
            logger.error({seasonId: p.seasonId, teamId: p.teamId, error: result.error}, "Failed to fetch team leaderboard");
            return result;
        }

        const rows = result.value.flatMap(r =>
            r.player_id === null || r.season_id === null || r.region_id === null
                ? []
                : [r as unknown as PlayerLeaderboardRow]
        );

        return Ok(rows);
    } catch (error) {
        logger.error({error, seasonId: p.seasonId, teamId: p.teamId}, "Unexpected error in getTeamLeaderboard");
        return Err(serializeError(error));
    }
}
