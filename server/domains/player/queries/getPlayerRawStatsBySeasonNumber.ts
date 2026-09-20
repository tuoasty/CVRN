import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient} from "@/shared/types/db";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {getPlayerByRobloxUserId} from "./getPlayerByRobloxUserId";
import {findPlayerRawStatTotals, findPlayerStatRanks} from "@/server/db/playerMatchStats.repo";
import {PlayerStatsResponse} from "../types";

export async function getPlayerRawStatsBySeasonNumber(
    supabase: DBClient,
    p: {robloxUserId: string; seasonNumber: number | null}
): Promise<Result<PlayerStatsResponse>> {
    try {
        const existing = await getPlayerByRobloxUserId(supabase, p.robloxUserId);
        if (!existing.ok) return existing;
        if (!existing.value) {
            return Err({message: "Player not found", code: "NOT_FOUND"});
        }

        const [totals, ranks] = await Promise.all([
            findPlayerRawStatTotals(supabase, {robloxUserId: p.robloxUserId, seasonNumber: p.seasonNumber}),
            findPlayerStatRanks(supabase, {robloxUserId: p.robloxUserId, seasonNumber: p.seasonNumber}),
        ]);
        if (!totals.ok) {
            logger.error({robloxUserId: p.robloxUserId, error: totals.error}, "Failed to fetch player raw stat totals");
            return totals;
        }
        if (!ranks.ok) {
            logger.error({robloxUserId: p.robloxUserId, error: ranks.error}, "Failed to fetch player stat ranks");
            return ranks;
        }
        const t = totals.value;
        const r = ranks.value;

        return Ok({
            roblox_user_id: p.robloxUserId,
            sets_played: t.sets_played,
            points_per_set: r.points_per_set,
            points_per_set_rank: r.points_per_set_rank,
            spiking: {
                ape_kills: t.ape_kills,
                ape_attempts: t.ape_attempts,
                delay_kills: t.delay_kills,
                quick_kills: t.quick_kills,
                wipes_tools: t.wipes_tools,
                kill_attempts: t.kill_attempts,
                spiking_errors: t.spiking_errors,
                kills_per_set: r.kills_per_set,
                kills_per_set_rank: r.kills_per_set_rank,
                hit_pct_rank: r.hit_pct_rank,
            },
            setting: {
                assists: t.assists,
                setting_errors: t.setting_errors,
                assists_per_set: r.assists_per_set,
                assists_per_set_rank: r.assists_per_set_rank,
                set_pct_rank: r.set_pct_rank,
            },
            blocking: {
                kill_blocks: t.kill_blocks,
                block_touches: t.block_touches,
                blocks_per_set: r.blocks_per_set,
                blocks_per_set_rank: r.blocks_per_set_rank,
                kb_pct_rank: r.kb_pct_rank,
            },
            receiving: {
                receives: t.receives,
                digs: t.digs,
                block_follows: t.block_follows,
                dives: t.dives,
                receive_errors: t.receive_errors,
                receives_per_set: r.receives_per_set,
                receives_per_set_rank: r.receives_per_set_rank,
                rec_pct_rank: r.rec_pct_rank,
            },
            serving: {
                jump_serve_aces: t.jump_serve_aces,
                float_aces: t.float_aces,
                service_errors: t.service_errors,
                aces_per_set: r.aces_per_set,
                aces_per_set_rank: r.aces_per_set_rank,
            },
        });
    } catch (error) {
        logger.error({error}, "Unexpected error fetching player raw stats");
        return Err(serializeError(error));
    }
}
