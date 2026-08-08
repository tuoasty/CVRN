import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient} from "@/shared/types/db";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {findRecentMatches, findRecentWeekMatches} from "@/server/db/matches.repo";
import {MatchWithDetails, MatchWithDetailsRow} from "../types";
import {toMatchWithDetails} from "../helpers/toMatchWithDetails";

export async function getRecentMatches(
    supabase: DBClient,
    seasonId: string,
    limit: number = 5
): Promise<Result<MatchWithDetails[]>> {
    try {
        const result = await findRecentMatches(supabase, seasonId, limit);
        if (!result.ok) {
            logger.error({ seasonId, limit, error: result.error }, "Failed to fetch recent matches");
            return result;
        }
        return Ok((result.value as unknown as MatchWithDetailsRow[]).map(toMatchWithDetails));
    } catch (error) {
        logger.error({ error }, "Unexpected error fetching recent matches");
        return Err(serializeError(error));
    }
}

export async function getRecentWeekMatches(
    supabase: DBClient,
    seasonId: string
): Promise<Result<MatchWithDetails[]>> {
    try {
        const result = await findRecentWeekMatches(supabase, seasonId);
        if (!result.ok) {
            logger.error({ seasonId, error: result.error }, "Failed to fetch recent week matches");
            return result;
        }
        return Ok((result.value as unknown as MatchWithDetailsRow[]).map(toMatchWithDetails));
    } catch (error) {
        logger.error({ error }, "Unexpected error fetching recent week matches");
        return Err(serializeError(error));
    }
}
