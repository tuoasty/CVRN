import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient} from "@/shared/types/db";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {findOfficialsBySimilarity} from "@/server/db/official.repo";
import {OfficialWithInfo, SearchOfficialsInput} from "../types";

export async function searchOfficialsInDatabase(
    supabase: DBClient,
    p: SearchOfficialsInput
): Promise<Result<OfficialWithInfo[]>> {
    try {
        const result = await findOfficialsBySimilarity(supabase, p.query);
        if (!result.ok) {
            logger.error({ query: p.query, error: result.error }, "Failed to search officials in database");
            return result;
        }
        return Ok(result.value as OfficialWithInfo[]);
    } catch (error) {
        logger.error({ error }, "Unexpected error searching officials in database");
        return Err(serializeError(error));
    }
}
