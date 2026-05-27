import { Result } from "@/shared/types/result";
import { DBClient } from "@/shared/types/db";
import { logger } from "@/server/utils/logger";
import { findPlayoffRoundCountsBySeason } from "@/server/db/playoff.repo";

export async function getPlayoffRoundCounts(
    supabase: DBClient,
    seasonId: string
): Promise<Result<{ round: string; count: number }[]>> {
    const result = await findPlayoffRoundCountsBySeason(supabase, seasonId);
    if (!result.ok) {
        logger.error({ seasonId, error: result.error }, "Failed to get playoff round counts");
    }
    return result;
}
