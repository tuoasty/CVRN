import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient, Team} from "@/shared/types/db";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {findAllTeams} from "@/server/db/teams.repo";

export async function getAllTeams(supabase: DBClient): Promise<Result<Team[]>> {
    try {
        const result = await findAllTeams(supabase);
        if (!result.ok) {
            logger.error({error: result.error}, "Failed to fetch all teams");
            return result;
        }
        return Ok(result.value);
    } catch (error) {
        return Err(serializeError(error));
    }
}
