import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient} from "@/shared/types/db";
import {SearchPlayersInput, PlayerWithTeamInfo} from "../types";
import {serializeError} from "@/server/utils/serializeableError";
import {findPlayersBySimilarity} from "@/server/db/players.repo";
import {logger} from "@/server/utils/logger";

export async function searchPlayersInDatabase(
    supabase: DBClient,
    p: SearchPlayersInput
): Promise<Result<PlayerWithTeamInfo[]>> {
    try {
        const result = await findPlayersBySimilarity(supabase, p.query);
        if (!result.ok) {
            logger.error({ query: p.query, error: result.error }, "Failed to search players in database");
            return result;
        }
        return Ok(result.value);
    } catch (error) {
        logger.error({ error }, "Unexpected error searching players in database");
        return Err(serializeError(error));
    }
}
