import {DBClient} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {deleteSeasonPodiumSlot as repoDelete} from "@/server/db/seasonHistory.repo";
import {DeleteSeasonPodiumSlotInput} from "../types";

export async function deleteSeasonPodiumSlot(
    supabase: DBClient,
    p: DeleteSeasonPodiumSlotInput
): Promise<Result<true>> {
    try {
        const result = await repoDelete(supabase, p.seasonId, p.teamId);
        if (!result.ok) {
            logger.error({input: p, error: result.error}, "Failed to delete podium slot");
            return result;
        }
        return Ok(true);
    } catch (error) {
        logger.error({error}, "Unexpected error deleting podium slot");
        return Err(serializeError(error));
    }
}
