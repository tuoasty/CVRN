import {DBClient} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {upsertSeasonPodiumSlot as repoUpsert} from "@/server/db/seasonHistory.repo";
import {UpsertSeasonPodiumSlotInput} from "../types";

export async function upsertSeasonPodiumSlot(
    supabase: DBClient,
    p: UpsertSeasonPodiumSlotInput
): Promise<Result<true>> {
    try {
        const result = await repoUpsert(supabase, {
            seasonId: p.seasonId,
            place: p.place,
            teamId: p.teamId,
            isOverride: p.isOverride,
            notes: p.notes,
        });
        if (!result.ok) {
            logger.error({input: p, error: result.error}, "Failed to upsert podium slot");
            return result;
        }
        return Ok(true);
    } catch (error) {
        logger.error({error}, "Unexpected error upserting podium slot");
        return Err(serializeError(error));
    }
}
