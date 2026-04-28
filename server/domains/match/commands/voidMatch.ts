import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient, Match} from "@/shared/types/db";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {findMatchById, rpcVoidMatch} from "@/server/db/matches.repo";
import {VoidMatchInput} from "../types";

export async function voidMatchService(
    supabase: DBClient,
    p: VoidMatchInput
): Promise<Result<Match>> {
    try {
        const { data: match, error: matchError } = await findMatchById(supabase, p.matchId);

        if (matchError || !match) {
            logger.error({ matchId: p.matchId, error: matchError }, "Match not found");
            return Err({
                message: "Match not found",
                code: "NOT_FOUND"
            });
        }

        if (match.status !== "completed") {
            return Err({
                message: "Can only void completed matches",
                code: "VALIDATION_ERROR"
            });
        }

        const result = await rpcVoidMatch(supabase, p.matchId);

        if (!result.ok) {
            logger.error({ matchId: p.matchId, error: result.error }, "Failed to void match via RPC");
            return result;
        }

        logger.info({ matchId: p.matchId }, "Match voided successfully");
        return Ok(result.value);
    } catch (error) {
        logger.error({ error }, "Unexpected error voiding match");
        return Err(serializeError(error));
    }
}
