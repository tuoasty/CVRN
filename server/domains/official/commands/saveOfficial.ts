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
        const {data: existingOfficial} = await findOfficialByRobloxId(supabase, p.robloxUserId);

        if (existingOfficial) {
            logger.info({robloxUserId: p.robloxUserId}, "Official already exists, syncing latest data");

            const syncResult = await lazySyncOfficial(supabase, existingOfficial);

            if (syncResult.ok) {
                return Ok(syncResult.value);
            }

            return Ok(existingOfficial);
        }

        const {data, error} = await upsertOfficial(supabase, p);

        if (error) {
            logger.error({robloxUserId: p.robloxUserId, error}, "Failed to upsert official");
            return Err(serializeError(error));
        }

        if (!data) {
            return Err({
                name: "UpsertError",
                message: "Failed to save official"
            });
        }

        return Ok(data);
    } catch (error) {
        logger.error({error}, "Unexpected error saving official");
        return Err(serializeError(error));
    }
}
