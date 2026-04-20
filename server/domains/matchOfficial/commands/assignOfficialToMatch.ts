import {DBClient, MatchOfficial} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {assignOfficial} from "@/server/db/matchOfficial.repo";
import {AssignOfficialInput} from "../types";

export async function assignOfficialToMatch(
    supabase: DBClient,
    p: AssignOfficialInput
): Promise<Result<MatchOfficial>> {
    try {
        const {data, error} = await assignOfficial(supabase, p);

        if (error) {
            logger.error({input: p, error}, "Failed to assign official to match");
            return Err(serializeError(error, "DB_ERROR"));
        }

        if (!data) {
            return Err({
                name: "AssignError",
                message: "Failed to assign official to match",
                code: "DB_ERROR"
            });
        }

        return Ok(data);
    } catch (error) {
        logger.error({error}, "Unexpected error assigning official to match");
        return Err(serializeError(error));
    }
}
