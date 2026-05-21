import {DBClient, Player} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {findMatchOfficialsByType} from "@/server/db/matchOfficial.repo";
import {batchSyncPlayers} from "@/server/domains/player/helpers/batchSyncPlayers";
import {runInBackground} from "@/server/utils/runInBackground";
import {MatchOfficialWithDetails, OfficialType} from "../types";

export async function getMatchOfficialsByType(
    supabase: DBClient,
    matchId: string,
    officialType: OfficialType
): Promise<Result<MatchOfficialWithDetails[]>> {
    try {
        const result = await findMatchOfficialsByType(supabase, matchId, officialType);
        if (!result.ok) {
            logger.error({matchId, officialType, error: result.error}, "Failed to fetch match officials by type");
            return result;
        }

        const players = result.value
            .map(mo => mo.official)
            .filter((o): o is Player => o !== null);

        runInBackground(() => batchSyncPlayers(supabase, players), "batchSyncPlayers");

        return Ok(result.value as unknown as MatchOfficialWithDetails[]);
    } catch (error) {
        logger.error({error}, "Unexpected error fetching match officials by type");
        return Err(serializeError(error));
    }
}
