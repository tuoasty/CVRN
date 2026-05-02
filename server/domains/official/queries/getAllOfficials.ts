import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient, Official} from "@/shared/types/db";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {findAllOfficials} from "@/server/db/official.repo";
import {batchSyncOfficials} from "../helpers/batchSyncOfficials";
import {runInBackground} from "@/server/utils/runInBackground";

export async function getAllOfficials(
    supabase: DBClient
): Promise<Result<Official[]>> {
    try {
        const result = await findAllOfficials(supabase);
        if (!result.ok) {
            logger.error({error: result.error}, "Failed to fetch all officials");
            return result;
        }

        runInBackground(() => batchSyncOfficials(supabase, result.value), "batchSyncOfficials");

        return Ok(result.value);
    } catch (error) {
        logger.error({error}, "Unexpected error fetching officials");
        return Err(serializeError(error));
    }
}
