import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient} from "@/shared/types/db";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {findOfficialByExactUsername} from "@/server/db/official.repo";
import {OfficialWithInfo, SearchOfficialsInput} from "../types";

export async function getOfficialByExactUsername(
    supabase: DBClient,
    p: SearchOfficialsInput
): Promise<Result<OfficialWithInfo | null>> {
    try {
        const lookup = await findOfficialByExactUsername(supabase, p.query);
        if (!lookup.ok) {
            logger.error({ query: p.query, error: lookup.error }, "Failed to find official by exact username");
            return lookup;
        }

        const official = lookup.value;
        if (!official || !official.username) {
            return Ok(null);
        }

        return Ok({
            id: official.id,
            roblox_user_id: official.roblox_user_id,
            username: official.username,
            display_name: official.display_name,
            avatar_url: official.avatar_url
        });
    } catch (error) {
        logger.error({ error }, "Unexpected error finding official by exact username");
        return Err(serializeError(error));
    }
}
