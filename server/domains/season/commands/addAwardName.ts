import {DBClient} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {findAwardNames, insertAwardName} from "@/server/db/seasonHistory.repo";
import {AddAwardNameInput} from "../types";

const SORT_ORDER_STEP = 10;

export async function addAwardName(
    supabase: DBClient,
    input: AddAwardNameInput
): Promise<Result<string>> {
    try {
        const list = await findAwardNames(supabase);
        if (!list.ok) {
            logger.error({error: list.error}, "Failed to fetch award list");
            return list;
        }
        const sortOrder = Math.max(0, ...list.value.map(row => row.sort_order)) + SORT_ORDER_STEP;
        const inserted = await insertAwardName(supabase, {name: input.name, sortOrder});
        if (!inserted.ok) {
            logger.error({name: input.name, error: inserted.error}, "Failed to add award name");
            return inserted;
        }
        return Ok(inserted.value.name);
    } catch (error) {
        logger.error({error}, "Unexpected error adding award name");
        return Err(serializeError(error));
    }
}
