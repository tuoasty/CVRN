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
        const { data, error } = await findOfficialsBySimilarity(supabase, p.query);

        if (error) {
            logger.error({ query: p.query, error }, "Failed to search officials in database");
            return Err(serializeError(error));
        }

        if (!data) {
            return Err({
                message: "Failed to search officials",
                name: "SearchError"
            });
        }

        return Ok(data);
    } catch (error) {
        logger.error({ error }, "Unexpected error searching officials in database");
        return Err(serializeError(error));
    }
}
