import {Result} from "@/shared/types/result";
import {DBClient} from "@/shared/types/db";
import {logger} from "@/server/utils/logger";
import {findCompletedPlayoffRoundsBySeason} from "@/server/db/playoff.repo";

export async function getCompletedPlayoffRounds(
    supabase: DBClient,
    seasonId: string
): Promise<Result<string[]>> {
    const result = await findCompletedPlayoffRoundsBySeason(supabase, seasonId);
    if (!result.ok) {
        logger.error({seasonId, error: result.error}, "Failed to get completed playoff rounds");
    }
    return result;
}
