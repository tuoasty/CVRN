import {DBClient, Season} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {updateSeasonById} from "@/server/db/seasons.repo";
import {UpdateSeasonInput} from "../types";

export async function updateSeason(
    supabase: DBClient,
    p: UpdateSeasonInput
): Promise<Result<Season>> {
    try {
        const {data, error} = await updateSeasonById(supabase, p.seasonId, {
            name: p.name,
            startDate: p.startDate,
            endDate: p.endDate,
            isActive: p.isActive,
            slug: p.slug,
            theme: p.theme
        });

        if (error) {
            logger.error({input: p, error}, "Failed to update season");
            return Err(serializeError(error));
        }

        if (!data) {
            return Err({
                message: "Season not found",
                name: "NotFoundError"
            });
        }

        return Ok(data as Season);
    } catch (error) {
        logger.error({error}, "Unexpected error updating season");
        return Err(serializeError(error));
    }
}
