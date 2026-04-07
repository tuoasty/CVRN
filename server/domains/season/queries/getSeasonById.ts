import {DBClient, Season} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {findSeasonById} from "@/server/db/seasons.repo";
import {SeasonIdInput} from "../types";

export async function getSeasonById(
    supabase: DBClient,
    p: SeasonIdInput
): Promise<Result<Season>> {
    try {
        const {data, error} = await findSeasonById(supabase, p.seasonId);

        if (error) {
            logger.error({seasonId: p.seasonId, error}, "Failed to fetch season by id");
            return Err(serializeError(error));
        }

        if (!data) {
            return Err({
                message: "Season not found",
                name: "NotFoundError"
            });
        }

        return Ok(data);
    } catch (error) {
        logger.error({error}, "Unexpected error fetching season by id");
        return Err(serializeError(error));
    }
}
