import {DBClient, Season} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {insertSeason} from "@/server/db/seasons.repo";
import {CreateSeasonInput} from "../types";
import {randomUUID} from "node:crypto";

export async function createSeason(
    supabase: DBClient,
    p: CreateSeasonInput
): Promise<Result<Season>> {
    try {
        const seasonId = randomUUID();

        const result = await insertSeason(supabase, {
            id: seasonId,
            name: p.name,
            regionId: p.regionId,
            startDate: p.startDate,
            endDate: p.endDate ?? null,
            isActive: false,
            slug: p.slug,
            theme: p.theme ?? null
        });
        if (!result.ok) {
            logger.error({input: p, error: result.error}, "Failed to insert season");
            return result;
        }
        return Ok(result.value as Season);
    } catch (error) {
        logger.error({error}, "Unexpected error creating season");
        return Err(serializeError(error));
    }
}
