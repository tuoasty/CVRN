import {DBClient} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {findSeasonBySlug} from "@/server/db/seasonHistory.repo";
import {SeasonDetail} from "../types";

export async function getSeasonDetail(
    supabase: DBClient,
    slug: string
): Promise<Result<SeasonDetail>> {
    try {
        const result = await findSeasonBySlug(supabase, slug);
        if (!result.ok) {
            logger.error({error: result.error, slug}, "Failed to fetch season detail");
            return result as Result<SeasonDetail>;
        }
        return Ok(result.value as SeasonDetail);
    } catch (error) {
        logger.error({error, slug}, "Unexpected error fetching season detail");
        return Err(serializeError(error));
    }
}
