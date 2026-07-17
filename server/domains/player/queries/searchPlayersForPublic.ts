import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient} from "@/shared/types/db";
import {PlayerSearchHit} from "../types";
import {serializeError} from "@/server/utils/serializeableError";
import {findPlayersForSearch} from "@/server/db/players.repo";
import {logger} from "@/server/utils/logger";

export async function searchPlayersForPublic(
    supabase: DBClient,
    p: {query: string}
): Promise<Result<PlayerSearchHit[]>> {
    try {
        const result = await findPlayersForSearch(supabase, p.query);
        if (!result.ok) {
            logger.error({query: p.query, error: result.error}, "Failed public player search");
            return result;
        }
        return Ok(result.value);
    } catch (error) {
        logger.error({error}, "Unexpected error in public player search");
        return Err(serializeError(error));
    }
}
