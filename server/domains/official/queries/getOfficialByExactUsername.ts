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
        const { data: official, error } = await findOfficialByExactUsername(supabase, p.query);

        if (error) {
            logger.error({ query: p.query, error }, "Failed to find official by exact username");
            return Err(serializeError(error));
        }

        if (!official || !official.username) {
            return Ok(null);
        }

        const result: OfficialWithInfo = {
            id: official.id,
            roblox_user_id: official.roblox_user_id,
            username: official.username,
            display_name: official.display_name,
            avatar_url: official.avatar_url
        };

        return Ok(result);
    } catch (error) {
        logger.error({ error }, "Unexpected error finding official by exact username");
        return Err(serializeError(error));
    }
}
