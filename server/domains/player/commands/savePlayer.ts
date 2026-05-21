import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient, Player} from "@/shared/types/db";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {findPlayerByRobloxId, upsertPlayer} from "@/server/db/players.repo";
import {lazySyncPlayer} from "../helpers/lazySyncPlayer";
import {runInBackground} from "@/server/utils/runInBackground";
import {SavePlayerInput} from "../types";

export async function savePlayer(
    supabase: DBClient,
    p: SavePlayerInput
): Promise<Result<Player>> {
    try {
        const lookup = await findPlayerByRobloxId(supabase, p.robloxUserId);
        if (lookup.ok && lookup.value) {
            const existing = lookup.value;
            logger.info({robloxUserId: p.robloxUserId}, "Player already exists, syncing latest data");
            runInBackground(() => lazySyncPlayer(supabase, existing), "lazySyncPlayer");
            return Ok(existing);
        }

        const upsertResult = await upsertPlayer(supabase, p);
        if (!upsertResult.ok) {
            logger.error({robloxUserId: p.robloxUserId, error: upsertResult.error}, "Failed to upsert player");
            return upsertResult;
        }
        return Ok(upsertResult.value);
    } catch (error) {
        logger.error({error}, "Unexpected error saving player");
        return Err(serializeError(error));
    }
}
