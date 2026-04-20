import {DBClient} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {findAllSeasons} from "@/server/db/seasons.repo";
import {SeasonWithPlayoffConfig} from "../types";

export async function getAllSeasons(
    supabase: DBClient
): Promise<Result<SeasonWithPlayoffConfig[]>> {
    try {
        const {data, error} = await findAllSeasons(supabase);

        if (error) {
            logger.error({error}, "Failed to fetch all seasons");
            return Err(serializeError(error, "DB_ERROR"));
        }

        if (!data) {
            return Err({
                message: "Failed to fetch seasons",
                name: "FetchError",
                code: "DB_ERROR"
            });
        }

        return Ok(data as SeasonWithPlayoffConfig[]);
    } catch (error) {
        logger.error({error}, "Unexpected error fetching all seasons");
        return Err(serializeError(error));
    }
}
