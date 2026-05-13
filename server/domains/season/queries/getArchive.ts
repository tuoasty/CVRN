import {DBClient} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {findArchiveSeasons} from "@/server/db/seasonHistory.repo";
import {ArchiveSeason} from "../types";

export async function getArchive(
    supabase: DBClient
): Promise<Result<ArchiveSeason[]>> {
    try {
        const result = await findArchiveSeasons(supabase);
        if (!result.ok) {
            logger.error({error: result.error}, "Failed to fetch archive");
            return result;
        }
        return Ok(result.value as ArchiveSeason[]);
    } catch (error) {
        logger.error({error}, "Unexpected error fetching archive");
        return Err(serializeError(error));
    }
}
