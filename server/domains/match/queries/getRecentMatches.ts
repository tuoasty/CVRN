import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient} from "@/shared/types/db";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {findRecentMatches} from "@/server/db/matches.repo";
import {MatchWithDetails} from "../types";
import {toMatchWithDetails} from "../helpers/toMatchWithDetails";

export async function getRecentMatches(
    supabase: DBClient,
    seasonId: string,
    limit: number = 5
): Promise<Result<MatchWithDetails[]>> {
    try {
        const { data, error } = await findRecentMatches(supabase, seasonId, limit);

        if (error) {
            logger.error({ seasonId, limit, error }, "Failed to fetch recent matches");
            return Err(serializeError(error));
        }

        if (!data) {
            return Ok([]);
        }

        const result: MatchWithDetails[] = data.map(toMatchWithDetails);

        return Ok(result);
    } catch (error) {
        logger.error({ error }, "Unexpected error fetching recent matches");
        return Err(serializeError(error));
    }
}
