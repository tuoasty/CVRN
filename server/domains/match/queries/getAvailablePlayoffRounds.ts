import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient} from "@/shared/types/db";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {findUniquePlayoffRoundsBySeason} from "@/server/db/playoff.repo";

export async function getAvailablePlayoffRounds(
    supabase: DBClient,
    seasonId: string
): Promise<Result<string[]>> {
    try {
        const { data, error } = await findUniquePlayoffRoundsBySeason(supabase, seasonId);

        if (error) {
            logger.error({ seasonId, error }, "Failed to fetch playoff rounds");
            return Err(serializeError(error, "DB_ERROR"));
        }

        if (!data) {
            return Ok([]);
        }

        const uniqueRounds = Array.from(new Set(data.map(r => r.round)));
        return Ok(uniqueRounds);
    } catch (error) {
        logger.error({ error }, "Unexpected error fetching playoff rounds");
        return Err(serializeError(error));
    }
}
