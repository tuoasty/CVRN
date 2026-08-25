import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient} from "@/shared/types/db";
import {PlayerSeasonStat} from "../types";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";

export async function getPlayerSeasonStats(
    supabase: DBClient,
    p: {playerId: string}
): Promise<Result<PlayerSeasonStat[]>> {
    try {
        const {data, error} = await supabase
            .from("v_player_leaderboard")
            .select("*")
            .eq("player_id", p.playerId)
            .order("season_id", {ascending: false});

        if (error) {
            logger.error({playerId: p.playerId, error}, "Failed to fetch player season stats");
            return Err(serializeError(error, "DB_ERROR"));
        }

        const rows: PlayerSeasonStat[] = (data ?? []).filter((r): r is typeof r & {season_id: string} => r.season_id !== null).map(r => ({
            ...r,
            season_name: r.season_name ?? "",
            season_slug: r.season_slug ?? "",
            region_code: r.region_code ?? "",
        } as PlayerSeasonStat));

        rows.sort((a, b) => b.season_name.localeCompare(a.season_name));

        return Ok(rows);
    } catch (error) {
        logger.error({error, playerId: p.playerId}, "Unexpected error in getPlayerSeasonStats");
        return Err(serializeError(error));
    }
}
