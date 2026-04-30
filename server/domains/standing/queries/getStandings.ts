import { DBClient } from "@/shared/types/db";
import { Err, Ok, Result } from "@/shared/types/result";
import { GetStandingsInput, StandingWithInfo } from "@/server/domains/standing";
import { serializeError } from "@/server/utils/serializeableError";
import { logger } from "@/server/utils/logger";
import {findStandingsBySeasonAndRegion} from "@/server/db/standings.repo";

export async function getStandings(
    supabase: DBClient,
    p: GetStandingsInput
): Promise<Result<StandingWithInfo[]>> {
    try {
        const result = await findStandingsBySeasonAndRegion(supabase, p);
        if (!result.ok) {
            logger.error({ params: p, error: result.error }, "Failed to fetch standings");
            return result;
        }
        return Ok(result.value);
    } catch (error) {
        logger.error({ error }, "Unexpected error fetching standings");
        return Err(serializeError(error));
    }
}
