import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient} from "@/shared/types/db";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {findMatchesWithDetailsBySeasonAndWeek} from "@/server/db/matches.repo";
import {MatchWithDetails, MatchWithDetailsRow} from "../types";
import {toMatchWithDetails} from "../helpers/toMatchWithDetails";

export async function getWeekSchedule(
    supabase: DBClient,
    p: { seasonId: string; week: number }
): Promise<Result<MatchWithDetails[]>> {
    try {
        const result = await findMatchesWithDetailsBySeasonAndWeek(supabase, p.seasonId, p.week);
        if (!result.ok) {
            logger.error({ seasonId: p.seasonId, week: p.week, error: result.error }, "Failed to fetch week schedule");
            return result;
        }
        return Ok((result.value as unknown as MatchWithDetailsRow[]).map(toMatchWithDetails));
    } catch (error) {
        logger.error({ error }, "Unexpected error fetching week schedule");
        return Err(serializeError(error));
    }
}
