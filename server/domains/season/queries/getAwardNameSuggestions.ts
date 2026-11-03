import {DBClient} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {findAwardNames, findAwardNamesByCategory} from "@/server/db/seasonHistory.repo";
import {dedupeAwardNames} from "../helpers/dedupeAwardNames";
import {AwardNameSuggestionsInput} from "../types";

export async function getAwardNameSuggestions(
    supabase: DBClient,
    input: AwardNameSuggestionsInput
): Promise<Result<string[]>> {
    try {
        if (input.category === "individual_winners") {
            const list = await findAwardNames(supabase);
            if (!list.ok) {
                logger.error({error: list.error}, "Failed to fetch award list");
                return list;
            }
            return Ok(list.value.map(row => row.name));
        }
        const result = await findAwardNamesByCategory(supabase, input.category);
        if (!result.ok) {
            logger.error({category: input.category, error: result.error}, "Failed to fetch award name suggestions");
            return result;
        }
        return Ok(dedupeAwardNames(result.value));
    } catch (error) {
        logger.error({error}, "Unexpected error fetching award name suggestions");
        return Err(serializeError(error));
    }
}
