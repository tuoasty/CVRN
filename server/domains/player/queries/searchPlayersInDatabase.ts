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
        const { data, error } = await findPlayersBySimilarity(supabase, p.query);

        if (error) {
            logger.error({ query: p.query, error }, "Failed to search players in database");
            return Err(serializeError(error));
        }

        if (!data) {
            return Err({
                message: "Failed to search players",
                name: "SearchError"
            });
        }

        return Ok(data);
    } catch (error) {
        logger.error({ error }, "Unexpected error searching players in database");
        return Err(serializeError(error));
    }
}
