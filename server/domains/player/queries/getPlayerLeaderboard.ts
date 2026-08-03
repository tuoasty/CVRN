import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient} from "@/shared/types/db";
import {PlayerLeaderboardInput, PlayerLeaderboardRow} from "../types";
import {findPlayerLeaderboard} from "@/server/db/playerMatchStats.repo";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";

export async function getPlayerLeaderboard(
    supabase: DBClient,
    p: PlayerLeaderboardInput
): Promise<Result<PlayerLeaderboardRow[]>> {
    try {
        const result = await findPlayerLeaderboard(supabase, p);
        if (!result.ok) {
            logger.error({regionCode: p.regionCode, error: result.error}, "Failed to fetch player leaderboard");
            return result;
        }

        const rows: PlayerLeaderboardRow[] = result.value.flatMap(r => {
            if (r.player_id === null || r.season_id === null || r.username === null || r.region_id === null) {
                return [];
            }
            return [{
                ...r,
                player_id: r.player_id,
                season_id: r.season_id,
                username: r.username,
                region_id: r.region_id,
                season_name: r.season_name ?? "",
                season_slug: r.season_slug ?? "",
                season_start_date: r.season_start_date ?? "",
                region_code: r.region_code ?? "",
            }];
        });

        return Ok(rows);
    } catch (error) {
        logger.error({error, regionCode: p.regionCode}, "Unexpected error in getPlayerLeaderboard");
        return Err(serializeError(error));
    }
}
