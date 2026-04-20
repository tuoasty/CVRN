import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient, Match} from "@/shared/types/db";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {findMatchById, deleteMatchSets, voidMatch} from "@/server/db/matches.repo";
import {VoidMatchInput} from "../types";
import {removeAllMatchOfficials} from "@/server/db/matchOfficial.repo";

export async function voidMatchService(
    supabase: DBClient,
    p: VoidMatchInput
): Promise<Result<Match>> {
    try {
        const { data: match, error: matchError } = await findMatchById(supabase, p.matchId);

        if (matchError || !match) {
            logger.error({ matchId: p.matchId, error: matchError }, "Match not found");
            return Err({
                name: "NotFoundError",
                message: "Match not found",
                code: "NOT_FOUND"
            });
        }

        if (match.status !== "completed") {
            return Err({
                name: "ValidationError",
                message: "Can only void completed matches",
                code: "VALIDATION_ERROR"
            });
        }

        const { error: setsError } = await deleteMatchSets(supabase, p.matchId);
        if (setsError) {
            logger.error({ matchId: p.matchId, error: setsError }, "Failed to delete match sets");
            return Err(serializeError(setsError));
        }

        const { error: officialsError } = await removeAllMatchOfficials(supabase, p.matchId);
        if (officialsError) {
            logger.error({ matchId: p.matchId, error: officialsError }, "Failed to remove match officials");
            return Err(serializeError(officialsError));
        }

        const { data: voidedMatch, error: voidError } = await voidMatch(supabase, p.matchId);
        if (voidError || !voidedMatch) {
            logger.error({ matchId: p.matchId, error: voidError }, "Failed to void match");
            return Err(serializeError(voidError));
        }

        logger.info({ matchId: p.matchId }, "Match voided successfully");
        return Ok(voidedMatch as Match);
    } catch (error) {
        logger.error({ error }, "Unexpected error voiding match");
        return Err(serializeError(error));
    }
}
