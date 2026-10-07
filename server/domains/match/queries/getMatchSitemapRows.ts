import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient} from "@/shared/types/db";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {findCompletedMatchSitemapRows} from "@/server/db/matches.repo";
import {MatchSitemapRow} from "../types";

export async function getMatchSitemapRows(supabase: DBClient): Promise<Result<MatchSitemapRow[]>> {
    try {
        const result = await findCompletedMatchSitemapRows(supabase);
        if (!result.ok) {
            logger.error({error: result.error}, "Failed to fetch match sitemap rows");
            return result;
        }
        return Ok(result.value);
    } catch (error) {
        logger.error({error}, "Unexpected error fetching match sitemap rows");
        return Err(serializeError(error));
    }
}
