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
        const { data, error } = await findStandingsBySeasonAndRegion(supabase, p);

        if (error) {
            logger.error({ params: p, error }, "Failed to fetch standings");
            return Err(serializeError(error, "DB_ERROR"));
        }

        if (!data) {
            return Err({
                message: "Failed to fetch standings",
                name: "FetchError",
                code: "DB_ERROR"
            });
        }

        return Ok(data);
    } catch (error) {
        logger.error({ error }, "Unexpected error fetching standings");
        return Err(serializeError(error));
    }
}
