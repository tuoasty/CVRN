import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient, Official} from "@/shared/types/db";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {findOfficialByRobloxId, upsertOfficial} from "@/server/db/official.repo";
import {lazySyncOfficial} from "../helpers/lazySyncOfficial";
import {SaveOfficialInput} from "../types";

export async function saveOfficial(
    supabase: DBClient,
    p: SaveOfficialInput
): Promise<Result<Official>> {
    try {
        const lookup = await findOfficialByRobloxId(supabase, p.robloxUserId);
        if (lookup.ok && lookup.value) {
            const existingOfficial = lookup.value;
            logger.info({robloxUserId: p.robloxUserId}, "Official already exists, syncing latest data");
            const syncResult = await lazySyncOfficial(supabase, existingOfficial);
            return syncResult.ok ? Ok(syncResult.value) : Ok(existingOfficial);
        }

        const upsertResult = await upsertOfficial(supabase, p);
        if (!upsertResult.ok) {
            logger.error({robloxUserId: p.robloxUserId, error: upsertResult.error}, "Failed to upsert official");
            return upsertResult;
        }
        return Ok(upsertResult.value);
    } catch (error) {
        logger.error({error}, "Unexpected error saving official");
        return Err(serializeError(error));
    }
}
