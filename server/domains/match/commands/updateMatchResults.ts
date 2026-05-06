import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient, Match} from "@/shared/types/db";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {findMatchById, rpcReapplyMatchResult} from "@/server/db/matches.repo";
import {CompleteMatchInput} from "../types";
import {validateAndCalculateMatchResult} from "../helpers/validateAndCalculateMatchResult";

export async function updateMatchResultsService(
    supabase: DBClient,
    p: CompleteMatchInput
): Promise<Result<Match>> {
    try {
        const matchLookup = await findMatchById(supabase, p.matchId);
        if (!matchLookup.ok) {
            logger.error({ matchId: p.matchId, error: matchLookup.error }, "Failed to look up match");
            return matchLookup;
        }
        const match = matchLookup.value;
        if (!match) {
            logger.error({ matchId: p.matchId }, "Match not found");
            return Err({
                message: "Match not found",
                code: "NOT_FOUND"
            });
        }

        if (match.status !== "completed") {
            return Err({
                message: "Can only update results for completed matches",
                code: "VALIDATION_ERROR"
            });
        }

        const calcResult = validateAndCalculateMatchResult(p, match);
        if (!calcResult.ok) return calcResult;
        const { homeSetsWon, awaySetsWon, homeTeamLvr, awayTeamLvr, setsToInsert, matchMvpPlayerId, loserMvpPlayerId } = calcResult.value;

        const result = await rpcReapplyMatchResult(supabase, {
            matchId:         p.matchId,
            sets:            setsToInsert,
            homeSetsWon,
            awaySetsWon,
            homeLvr:         homeTeamLvr,
            awayLvr:         awayTeamLvr,
            mvpPlayerId:     matchMvpPlayerId,
            loserMvpPlayerId,
            isForfeit:       p.isForfeit || false,
        });

        if (!result.ok) {
            logger.error({ matchId: p.matchId, error: result.error }, "Failed to reapply match result via RPC");
            return result;
        }

        logger.info({ matchId: p.matchId, homeSetsWon, awaySetsWon, isForfeit: p.isForfeit }, "Match results updated successfully");
        return Ok(result.value);
    } catch (error) {
        logger.error({ error }, "Unexpected error updating match results");
        return Err(serializeError(error));
    }
}
