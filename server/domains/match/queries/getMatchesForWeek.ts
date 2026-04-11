import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient, Match} from "@/shared/types/db";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {findMatchesBySeasonAndWeek} from "@/server/db/matches.repo";

export async function getMatchesForWeek(
    supabase: DBClient,
    p: {
        seasonId: string,
        week: number
    }
): Promise<Result<Match[]>> {
    try {
        const {data, error} = await findMatchesBySeasonAndWeek(supabase, p.seasonId, p.week);

        if (error) {
            logger.error({seasonId: p.seasonId, week: p.week, error}, "Failed to fetch matches for week");
            return Err(serializeError(error));
        }

        if (!data) {
            return Ok([]);
        }

        return Ok(data as Match[]);
    } catch (error) {
        logger.error({error}, "Unexpected error fetching matches for week");
        return Err(serializeError(error));
    }
}
