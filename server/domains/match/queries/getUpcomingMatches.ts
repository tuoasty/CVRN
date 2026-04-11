import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient} from "@/shared/types/db";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {findUpcomingMatches} from "@/server/db/matches.repo";
import {MatchWithDetails} from "../types";
import {toMatchWithDetails} from "../helpers/toMatchWithDetails";

export async function getUpcomingMatches(
    supabase: DBClient,
    seasonId: string,
    limit: number = 5
): Promise<Result<MatchWithDetails[]>> {
    try {
        const { data, error } = await findUpcomingMatches(supabase, seasonId, limit);

        if (error) {
            logger.error({ seasonId, limit, error }, "Failed to fetch upcoming matches");
            return Err(serializeError(error));
        }

        if (!data) {
            return Ok([]);
        }

        const result: MatchWithDetails[] = data.map(toMatchWithDetails);

        return Ok(result);
    } catch (error) {
        logger.error({ error }, "Unexpected error fetching upcoming matches");
        return Err(serializeError(error));
    }
}
