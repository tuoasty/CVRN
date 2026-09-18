import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient} from "@/shared/types/db";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {findRawStatSummary} from "@/server/db/playerMatchStats.repo";
import {RawStatSummaryResponse} from "../types";

export async function getRawStatSummaryBySeasonNumber(
    supabase: DBClient,
    seasonNumber: number | null
): Promise<Result<RawStatSummaryResponse>> {
    try {
        const summary = await findRawStatSummary(supabase, seasonNumber);
        if (!summary.ok) {
            logger.error({seasonNumber, error: summary.error}, "Failed to fetch raw stat summary");
            return summary;
        }
        const r = summary.value;

        return Ok({
            sets_played: {min: r.sets_played_min, max: r.sets_played_max, mean: r.sets_played_mean},
            points_per_set: {min: r.points_per_set_min, max: r.points_per_set_max, mean: r.points_per_set_mean},
            spiking: {
                ape_kills: {min: r.ape_kills_min, max: r.ape_kills_max, mean: r.ape_kills_mean},
                ape_attempts: {min: r.ape_attempts_min, max: r.ape_attempts_max, mean: r.ape_attempts_mean},
                delay_kills: {min: r.delay_kills_min, max: r.delay_kills_max, mean: r.delay_kills_mean},
                quick_kills: {min: r.quick_kills_min, max: r.quick_kills_max, mean: r.quick_kills_mean},
                wipes_tools: {min: r.wipes_tools_min, max: r.wipes_tools_max, mean: r.wipes_tools_mean},
                kill_attempts: {min: r.kill_attempts_min, max: r.kill_attempts_max, mean: r.kill_attempts_mean},
                spiking_errors: {min: r.spiking_errors_min, max: r.spiking_errors_max, mean: r.spiking_errors_mean},
                kills_per_set: {min: r.kills_per_set_min, max: r.kills_per_set_max, mean: r.kills_per_set_mean},
                hit_pct: {min: r.hit_pct_min, max: r.hit_pct_max, mean: r.hit_pct_mean},
            },
            setting: {
                assists: {min: r.assists_min, max: r.assists_max, mean: r.assists_mean},
                setting_errors: {min: r.setting_errors_min, max: r.setting_errors_max, mean: r.setting_errors_mean},
                assists_per_set: {min: r.assists_per_set_min, max: r.assists_per_set_max, mean: r.assists_per_set_mean},
                set_pct: {min: r.set_pct_min, max: r.set_pct_max, mean: r.set_pct_mean},
            },
            blocking: {
                kill_blocks: {min: r.kill_blocks_min, max: r.kill_blocks_max, mean: r.kill_blocks_mean},
                block_touches: {min: r.block_touches_min, max: r.block_touches_max, mean: r.block_touches_mean},
                blocks_per_set: {min: r.blocks_per_set_min, max: r.blocks_per_set_max, mean: r.blocks_per_set_mean},
                kb_pct: {min: r.kb_pct_min, max: r.kb_pct_max, mean: r.kb_pct_mean},
            },
            receiving: {
                receives: {min: r.receives_min, max: r.receives_max, mean: r.receives_mean},
                digs: {min: r.digs_min, max: r.digs_max, mean: r.digs_mean},
                block_follows: {min: r.block_follows_min, max: r.block_follows_max, mean: r.block_follows_mean},
                dives: {min: r.dives_min, max: r.dives_max, mean: r.dives_mean},
                receive_errors: {min: r.receive_errors_min, max: r.receive_errors_max, mean: r.receive_errors_mean},
                receives_per_set: {min: r.receives_per_set_min, max: r.receives_per_set_max, mean: r.receives_per_set_mean},
                rec_pct: {min: r.rec_pct_min, max: r.rec_pct_max, mean: r.rec_pct_mean},
            },
            serving: {
                jump_serve_aces: {min: r.jump_serve_aces_min, max: r.jump_serve_aces_max, mean: r.jump_serve_aces_mean},
                float_aces: {min: r.float_aces_min, max: r.float_aces_max, mean: r.float_aces_mean},
                service_errors: {min: r.service_errors_min, max: r.service_errors_max, mean: r.service_errors_mean},
                aces_per_set: {min: r.aces_per_set_min, max: r.aces_per_set_max, mean: r.aces_per_set_mean},
            },
        });
    } catch (error) {
        logger.error({error}, "Unexpected error fetching raw stat summary");
        return Err(serializeError(error));
    }
}
