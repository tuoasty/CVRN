import {DBClient} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {removeAllOfficialsByType} from "@/server/db/matchOfficial.repo";
import {OfficialType} from "../types";

export async function removeAllOfficialsOfType(
    supabase: DBClient,
    matchId: string,
    officialType: OfficialType
): Promise<Result<boolean>> {
    try {
        const result = await removeAllOfficialsByType(supabase, matchId, officialType);
        if (!result.ok) {
            logger.error({matchId, officialType, error: result.error}, "Failed to remove all officials of type from match");
            return result;
        }
        return Ok(true);
    } catch (error) {
        logger.error({error}, "Unexpected error removing all officials of type from match");
        return Err(serializeError(error));
    }
}
