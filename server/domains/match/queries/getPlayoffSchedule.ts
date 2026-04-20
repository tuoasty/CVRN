import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient} from "@/shared/types/db";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {findMatchesWithDetailsBySeasonAndRound} from "@/server/db/playoff.repo";
import {MatchWithDetails} from "../types";
import {toMatchWithDetails} from "../helpers/toMatchWithDetails";
import {GetPlayoffScheduleInput} from "@/server/dto/playoff.dto";

export async function getPlayoffSchedule(
    supabase: DBClient,
    p: GetPlayoffScheduleInput
): Promise<Result<MatchWithDetails[]>> {
    try {
        const { data, error } = await findMatchesWithDetailsBySeasonAndRound(supabase, p.seasonId, p.round);

        if (error) {
            logger.error({ seasonId: p.seasonId, round: p.round, error }, "Failed to fetch playoff schedule");
            return Err(serializeError(error, "DB_ERROR"));
        }

        if (!data) {
            return Ok([]);
        }

        const result: MatchWithDetails[] = data.map(row => toMatchWithDetails(row.matches));

        return Ok(result);
    } catch (error) {
        logger.error({ error }, "Unexpected error fetching playoff schedule");
        return Err(serializeError(error));
    }
}
