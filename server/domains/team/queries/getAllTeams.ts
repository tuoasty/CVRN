import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient, Team} from "@/shared/types/db";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {findAllTeams} from "@/server/db/teams.repo";

export async function getAllTeams(supabase: DBClient): Promise<Result<Team[]>> {
    try {
        const {data, error} = await findAllTeams(supabase);
        if (error) {
            logger.error({error}, "Failed to fetch all teams");
            return Err(serializeError(error, "DB_ERROR"));
        }

        if (!data) {
            return Err({
                message: "Failed to fetch teams",
                code: "DB_ERROR"
            });
        }

        return Ok(data);
    } catch (error) {
        return Err(serializeError(error));
    }
}
