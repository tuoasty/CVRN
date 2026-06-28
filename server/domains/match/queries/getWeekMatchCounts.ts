import { Result } from "@/shared/types/result";
import { DBClient } from "@/shared/types/db";
import { logger } from "@/server/utils/logger";
import { findWeekMatchCountsBySeason } from "@/server/db/matches.repo";

export async function getWeekMatchCounts(
    supabase: DBClient,
    seasonId: string
): Promise<Result<{ week: number; total: number; completed: number }[]>> {
    const result = await findWeekMatchCountsBySeason(supabase, seasonId);
    if (!result.ok) {
        logger.error({ seasonId, error: result.error }, "Failed to get week match counts");
    }
    return result;
}
