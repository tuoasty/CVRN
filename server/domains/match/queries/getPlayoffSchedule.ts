import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient} from "@/shared/types/db";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {findMatchesWithDetailsBySeasonAndRound} from "@/server/db/playoff.repo";
import {MatchWithDetails, MatchWithDetailsRow} from "../types";
import {toMatchWithDetails} from "../helpers/toMatchWithDetails";
import {GetPlayoffScheduleInput} from "@/server/domains/playoff";

export async function getPlayoffSchedule(
    supabase: DBClient,
    p: GetPlayoffScheduleInput
): Promise<Result<MatchWithDetails[]>> {
    try {
        const result = await findMatchesWithDetailsBySeasonAndRound(supabase, p.seasonId, p.round);
        if (!result.ok) {
            logger.error({ seasonId: p.seasonId, round: p.round, error: result.error }, "Failed to fetch playoff schedule");
            return result;
        }
        return Ok(result.value.map(row => toMatchWithDetails(row.matches as unknown as MatchWithDetailsRow)));
    } catch (error) {
        logger.error({ error }, "Unexpected error fetching playoff schedule");
        return Err(serializeError(error));
    }
}
