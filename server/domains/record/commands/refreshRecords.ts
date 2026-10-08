import {DBClient} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {refreshRecordsView} from "@/server/db/records.repo";

export async function refreshRecords(supabase: DBClient): Promise<Result<true>> {
    try {
        const result = await refreshRecordsView(supabase);
        if (!result.ok) {
            logger.error({error: result.error}, "Failed to refresh records");
            return result;
        }
        logger.info("Refreshed records materialized view");
        return Ok(true);
    } catch (error) {
        logger.error({error}, "Unexpected error refreshing records");
        return Err(serializeError(error));
    }
}
