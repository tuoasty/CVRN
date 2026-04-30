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
        const result = await findUniquePlayoffRoundsBySeason(supabase, seasonId);
        if (!result.ok) {
            logger.error({ seasonId, error: result.error }, "Failed to fetch playoff rounds");
            return result;
        }
        return Ok(Array.from(new Set(result.value.map(r => r.round))));
    } catch (error) {
        logger.error({ error }, "Unexpected error fetching playoff rounds");
        return Err(serializeError(error));
    }
}
