import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient} from "@/shared/types/db";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {findAllTeamsWithRegions} from "@/server/db/teams.repo";
import {TeamWithRegion} from "../types";

export async function getAllTeamsWithRegions(supabase: DBClient): Promise<Result<TeamWithRegion[]>> {
    try {
        const result = await findAllTeamsWithRegions(supabase);
        if (!result.ok) {
            logger.error({error: result.error}, "Failed to fetch teams with regions");
            return result;
        }
        return Ok(result.value as TeamWithRegion[]);
    } catch (error) {
        return Err(serializeError(error));
    }
}
