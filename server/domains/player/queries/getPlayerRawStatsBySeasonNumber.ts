import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient} from "@/shared/types/db";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {getPlayerByRobloxUserId} from "./getPlayerByRobloxUserId";
import {findPlayerRawStatTotals} from "@/server/db/playerMatchStats.repo";
import {PlayerRawStatsResponse} from "../types";

export async function getPlayerRawStatsBySeasonNumber(
    supabase: DBClient,
    p: {robloxUserId: string; seasonNumber: number | null}
): Promise<Result<PlayerRawStatsResponse>> {
    try {
        const existing = await getPlayerByRobloxUserId(supabase, p.robloxUserId);
        if (!existing.ok) return existing;
        if (!existing.value) {
            return Err({message: "Player not found", code: "NOT_FOUND"});
        }

        const totals = await findPlayerRawStatTotals(supabase, {
            robloxUserId: p.robloxUserId,
            seasonNumber: p.seasonNumber,
        });
        if (!totals.ok) {
            logger.error({robloxUserId: p.robloxUserId, error: totals.error}, "Failed to fetch player raw stat totals");
            return totals;
        }
        const t = totals.value;

        return Ok({
            roblox_user_id: p.robloxUserId,
            sets_played: t.sets_played,
            spiking: {
                ape_kills: t.ape_kills,
                ape_attempts: t.ape_attempts,
                delay_kills: t.delay_kills,
                quick_kills: t.quick_kills,
                wipes_tools: t.wipes_tools,
                kill_attempts: t.kill_attempts,
                spiking_errors: t.spiking_errors,
            },
            setting: {
                assists: t.assists,
                setting_errors: t.setting_errors,
            },
            blocking: {
                kill_blocks: t.kill_blocks,
                block_touches: t.block_touches,
            },
            receiving: {
                receives: t.receives,
                digs: t.digs,
                block_follows: t.block_follows,
                dives: t.dives,
                receive_errors: t.receive_errors,
            },
            serving: {
                jump_serve_aces: t.jump_serve_aces,
                float_aces: t.float_aces,
                service_errors: t.service_errors,
            },
        });
    } catch (error) {
        logger.error({error}, "Unexpected error fetching player raw stats");
        return Err(serializeError(error));
    }
}
