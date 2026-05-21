import {DBClient, Player} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {findMatchOfficials} from "@/server/db/matchOfficial.repo";
import {batchSyncPlayers} from "@/server/domains/player/helpers/batchSyncPlayers";
import {runInBackground} from "@/server/utils/runInBackground";
import {MatchOfficialWithDetails, MatchIdInput} from "../types";

export async function getMatchOfficials(
    supabase: DBClient,
    p: MatchIdInput
): Promise<Result<MatchOfficialWithDetails[]>> {
    try {
        const result = await findMatchOfficials(supabase, p.matchId);
        if (!result.ok) {
            logger.error({matchId: p.matchId, error: result.error}, "Failed to fetch match officials");
            return result;
        }

        const players = result.value
            .map(mo => mo.player)
            .filter((p): p is Player => p !== null);

        runInBackground(() => batchSyncPlayers(supabase, players), "batchSyncPlayers");

        return Ok(result.value as unknown as MatchOfficialWithDetails[]);
    } catch (error) {
        logger.error({error}, "Unexpected error fetching match officials");
        return Err(serializeError(error));
    }
}
