import {DBClient} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {findSeasonPodium, upsertSeasonPodiumSlot} from "@/server/db/seasonHistory.repo";
import {deriveSeasonPodiumFromPlayoffs} from "../helpers/deriveSeasonPodium";

export async function deriveAndSaveSeasonPodium(
    supabase: DBClient,
    seasonId: string
): Promise<Result<{skipped: boolean}>> {
    try {
        const existing = await findSeasonPodium(supabase, seasonId);
        if (!existing.ok) return existing;
        if (existing.value.length > 0) return Ok({skipped: true});

        const derived = await deriveSeasonPodiumFromPlayoffs(supabase, seasonId);
        if (derived.length === 0) {
            return Err({message: "No completed playoff final found for this season", code: "NOT_FOUND"});
        }

        for (const slot of derived) {
            const r = await upsertSeasonPodiumSlot(supabase, {
                seasonId,
                place: slot.place,
                teamId: slot.teamId,
                isOverride: false,
            });
            if (!r.ok) {
                logger.error({slot, error: r.error}, "Failed to save derived podium slot");
                return r;
            }
        }

        return Ok({skipped: false});
    } catch (error) {
        logger.error({error}, "Unexpected error deriving season podium");
        return Err(serializeError(error));
    }
}
