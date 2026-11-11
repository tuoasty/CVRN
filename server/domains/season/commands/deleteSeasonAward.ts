import {DBClient} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {getSupabaseAdmin} from "@/server/supabase/admin";
import {BUCKETS} from "@/server/storage/storage.paths";
import {deleteFile} from "@/server/storage/storage.service";
import {deleteSeasonAwardById, findSeasonAwardBucketPath} from "@/server/db/seasonHistory.repo";
import {DeleteSeasonAwardInput} from "../types";

export async function deleteSeasonAward(
    supabase: DBClient,
    p: DeleteSeasonAwardInput
): Promise<Result<true>> {
    try {
        const pathResult = await findSeasonAwardBucketPath(supabase, p.awardId);
        if (!pathResult.ok) {
            logger.error({input: p, error: pathResult.error}, "Failed to look up season award avatar path");
            return pathResult;
        }

        const result = await deleteSeasonAwardById(supabase, p.awardId);
        if (!result.ok) {
            logger.error({input: p, error: result.error}, "Failed to delete season award");
            return result;
        }

        if (pathResult.value) {
            const fileResult = await deleteFile(getSupabaseAdmin(), {bucket: BUCKETS.PUBLIC, path: pathResult.value});
            if (!fileResult.ok) {
                logger.error({awardId: p.awardId, path: pathResult.value, error: fileResult.error}, "Failed to delete season award avatar file");
            }
        }

        return Ok(true);
    } catch (error) {
        logger.error({error}, "Unexpected error deleting season award");
        return Err(serializeError(error));
    }
}
