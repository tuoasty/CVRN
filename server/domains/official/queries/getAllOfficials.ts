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
        const {data, error} = await findAllOfficials(supabase);

        if (error) {
            logger.error({error}, "Failed to fetch all officials");
            return Err(serializeError(error, "DB_ERROR"));
        }

        if (!data) {
            return Err({
                message: "Failed to fetch officials",
                code: "DB_ERROR"
            });
        }

        const syncedOfficials: Official[] = await Promise.all(
            data.map(async (official) => {
                const result = await lazySyncOfficial(supabase, official);
                return result.ok ? result.value : official;
            })
        );

        return Ok(syncedOfficials);
    } catch (error) {
        logger.error({error}, "Unexpected error fetching officials");
        return Err(serializeError(error));
    }
}
