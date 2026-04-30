import {DBClient} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {removeOfficial} from "@/server/db/matchOfficial.repo";
import {OfficialType} from "../types";

export async function removeOfficialFromMatch(
    supabase: DBClient,
    matchId: string,
    officialId: string,
    officialType: OfficialType
): Promise<Result<boolean>> {
    try {
        const result = await removeOfficial(supabase, matchId, officialId, officialType);
        if (!result.ok) {
            logger.error({matchId, officialId, officialType, error: result.error}, "Failed to remove official from match");
            return result;
        }
        return Ok(true);
    } catch (error) {
        logger.error({error}, "Unexpected error removing official from match");
        return Err(serializeError(error));
    }
}
