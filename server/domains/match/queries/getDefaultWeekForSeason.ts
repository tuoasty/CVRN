import { Result } from "@/shared/types/result";
import { DBClient } from "@/shared/types/db";
import { logger } from "@/server/utils/logger";
import { findDefaultWeekForSeason } from "@/server/db/matches.repo";

export async function getDefaultWeekForSeason(
    supabase: DBClient,
    seasonId: string
): Promise<Result<number>> {
    const result = await findDefaultWeekForSeason(supabase, seasonId);
    if (!result.ok) {
        logger.error({ seasonId, error: result.error }, "Failed to get default week for season");
    }
    return result;
}
