import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient} from "@/shared/types/db";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {findAllTeamsWithRegions} from "@/server/db/teams.repo";
import {TeamWithRegion} from "../types";

export async function getAllTeamsWithRegions(supabase: DBClient): Promise<Result<TeamWithRegion[]>> {
    try {
        const {data, error} = await findAllTeamsWithRegions(supabase);
        if (error) {
            logger.error({error}, "Failed to fetch teams with regions");
            return Err(serializeError(error));
        }

        if (!data) {
            return Err({
                message: "Failed to fetch teams with regions",
                name: "FetchError"
            });
        }

        return Ok(data as TeamWithRegion[]);
    } catch (error) {
        return Err(serializeError(error));
    }
}
