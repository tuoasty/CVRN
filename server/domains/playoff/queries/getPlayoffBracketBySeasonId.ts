import {DBClient, PlayoffBracket} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {findPlayoffBracketsBySeasonId} from "@/server/db/playoff.repo";

export async function getPlayoffBracketBySeasonId(supabase: DBClient, seasonId: string): Promise<Result<PlayoffBracket[]>> {
    try {
        const { data, error } = await findPlayoffBracketsBySeasonId(supabase, seasonId);

        if (error) {
            logger.error({ error }, "Failed to fetch playoff bracket matches");
            return Err(serializeError(error, "DB_ERROR"));
        }

        if (!data) {
            return Err({
                name: "FetchError",
                message: "Failed to fetch playoff brackets",
                code: "DB_ERROR"
            });
        }

        return Ok(data);
    } catch (error) {
        logger.error({ error }, "Unexpected error fetching playoff brackets");
        return Err(serializeError(error));
    }
}
