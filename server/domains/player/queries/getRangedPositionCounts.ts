import {Err, Result} from "@/shared/types/result";
import {DBClient} from "@/shared/types/db";
import {findRangedPositionCounts, RangedPositionCountsRow} from "@/server/db/playerMatchStats.repo";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";

export async function getRangedPositionCounts(
    supabase: DBClient,
    p: {seasonId: string; from: string; to: string}
): Promise<Result<RangedPositionCountsRow[]>> {
    try {
        const result = await findRangedPositionCounts(supabase, p);
        if (!result.ok) {
            logger.error({seasonId: p.seasonId, error: result.error}, "Failed to fetch ranged position counts");
        }
        return result;
    } catch (error) {
        logger.error({error, seasonId: p.seasonId}, "Unexpected error in getRangedPositionCounts");
        return Err(serializeError(error));
    }
}
