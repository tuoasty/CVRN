import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient, Official} from "@/shared/types/db";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {findAllOfficials} from "@/server/db/official.repo";
import {lazySyncOfficial} from "../helpers/lazySyncOfficial";

export async function getAllOfficials(
    supabase: DBClient
): Promise<Result<Official[]>> {
    try {
        const result = await findAllOfficials(supabase);
        if (!result.ok) {
            logger.error({error: result.error}, "Failed to fetch all officials");
            return result;
        }

        const syncedOfficials: Official[] = await Promise.all(
            result.value.map(async (official) => {
                const syncResult = await lazySyncOfficial(supabase, official);
                return syncResult.ok ? syncResult.value : official;
            })
        );

        return Ok(syncedOfficials);
    } catch (error) {
        logger.error({error}, "Unexpected error fetching officials");
        return Err(serializeError(error));
    }
}
