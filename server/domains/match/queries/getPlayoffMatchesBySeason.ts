import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient, Match} from "@/shared/types/db";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {findPlayoffMatchesFullBySeason} from "@/server/db/matches.repo";

/**
 * Every playoff match in one season, as full rows.
 *
 * Backs the public bracket display, which needs `home_sets_won` / `away_sets_won` /
 * `best_of` to render scores and therefore cannot use the narrow projection that
 * `getSeasonPlayoffMatches` (matchStats) builds on.
 */
export async function getPlayoffMatchesBySeason(
    supabase: DBClient,
    seasonId: string
): Promise<Result<Match[]>> {
    try {
        const result = await findPlayoffMatchesFullBySeason(supabase, seasonId);
        if (!result.ok) {
            logger.error({seasonId, error: result.error}, "Failed to fetch playoff matches");
            return result;
        }
        return Ok(result.value);
    } catch (error) {
        logger.error({seasonId, error}, "Unexpected error fetching playoff matches");
        return Err(serializeError(error));
    }
}
