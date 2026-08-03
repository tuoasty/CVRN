import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient} from "@/shared/types/db";
import {LeaderboardStatRow, PlayerLeaderboardInput} from "../types";
import {findPlayerLeaderboard} from "@/server/db/playerMatchStats.repo";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";

const IDENTITY_KEYS: readonly string[] = [
    "username",
    "display_name",
    "avatar_url",
    "season_name",
    "season_slug",
    "season_start_date",
    "region_code",
    "team_name",
    "team_slug",
    "team_logo_url",
    "team_logo_bg_removed",
];

export async function getLeaderboardStatRows(
    supabase: DBClient,
    p: PlayerLeaderboardInput
): Promise<Result<LeaderboardStatRow[]>> {
    try {
        const result = await findPlayerLeaderboard(supabase, p);
        if (!result.ok) {
            logger.error({regionCode: p.regionCode, error: result.error}, "Failed to fetch leaderboard stat rows");
            return result;
        }

        const rows: LeaderboardStatRow[] = result.value.flatMap(r => {
            if (r.player_id === null || r.season_id === null || r.region_id === null) return [];

            const stats: Record<string, unknown> = {};
            for (const [key, value] of Object.entries(r)) {
                if (!IDENTITY_KEYS.includes(key)) stats[key] = value;
            }

            return [{
                ...stats,
                player_id: r.player_id,
                season_id: r.season_id,
                region_id: r.region_id,
            } as LeaderboardStatRow];
        });

        return Ok(rows);
    } catch (error) {
        logger.error({error, regionCode: p.regionCode}, "Unexpected error in getLeaderboardStatRows");
        return Err(serializeError(error));
    }
}
