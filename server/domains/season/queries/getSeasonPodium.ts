import {DBClient} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {findSeasonPodium} from "@/server/db/seasonHistory.repo";
import {SeasonPodiumEntryWithTeam} from "../types";

export async function getSeasonPodium(
    supabase: DBClient,
    seasonId: string
): Promise<Result<SeasonPodiumEntryWithTeam[]>> {
    try {
        const result = await findSeasonPodium(supabase, seasonId);
        if (!result.ok) {
            logger.error({seasonId, error: result.error}, "Failed to fetch season podium");
            return result;
        }
        return Ok(result.value as unknown as SeasonPodiumEntryWithTeam[]);
    } catch (error) {
        logger.error({error}, "Unexpected error fetching season podium");
        return Err(serializeError(error));
    }
}
