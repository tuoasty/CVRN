import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient} from "@/shared/types/db";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {findMatchesWithDetailsBySeasonAndWeek} from "@/server/db/matches.repo";
import {MatchWithDetails} from "../types";
import {toMatchWithDetails} from "../helpers/toMatchWithDetails";

export async function getWeekSchedule(
    supabase: DBClient,
    p: { seasonId: string; week: number }
): Promise<Result<MatchWithDetails[]>> {
    try {
        const { data, error } = await findMatchesWithDetailsBySeasonAndWeek(supabase, p.seasonId, p.week);

        if (error) {
            logger.error({ seasonId: p.seasonId, week: p.week, error }, "Failed to fetch week schedule");
            return Err(serializeError(error, "DB_ERROR"));
        }

        if (!data) {
            return Ok([]);
        }

        const result: MatchWithDetails[] = data.map(toMatchWithDetails);

        return Ok(result);
    } catch (error) {
        logger.error({ error }, "Unexpected error fetching week schedule");
        return Err(serializeError(error));
    }
}
