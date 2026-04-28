import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient, Match} from "@/shared/types/db";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {findMatchById, rpcCompleteMatch} from "@/server/db/matches.repo";
import {CompleteMatchInput} from "../types";
import {validateAndCalculateMatchResult} from "../helpers/validateAndCalculateMatchResult";
import {convertToUTC, isValidTimezone} from "@/server/utils/timezone";

export async function completeMatchService(
    supabase: DBClient,
    p: CompleteMatchInput
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

        if (match.status !== "scheduled") {
            return Err({
                message: "Can only complete scheduled matches",
                code: "VALIDATION_ERROR"
            });
        }

        const calcResult = validateAndCalculateMatchResult(p, match);
        if (!calcResult.ok) return calcResult;
        const { homeSetsWon, awaySetsWon, homeTeamLvr, awayTeamLvr, setsToInsert, matchMvpPlayerId, loserMvpPlayerId } = calcResult.value;

        let scheduledAt: string | null = match.scheduled_at ?? null;

        if (p.scheduledDate !== undefined && p.scheduledTime !== undefined && p.timezone !== undefined) {
            if (p.scheduledDate && p.scheduledTime && p.timezone) {
                if (!isValidTimezone(p.timezone)) {
                    return Err({
                        message: "Invalid timezone",
                        code: "VALIDATION_ERROR"
                    });
                }

                const converted = convertToUTC(p.scheduledDate, p.scheduledTime, p.timezone);
                if (!converted) {
                    return Err({
                        message: "Invalid date/time/timezone combination",
                        code: "VALIDATION_ERROR"
                    });
                }
                scheduledAt = converted;
            } else {
                scheduledAt = null;
            }
        }

        const result = await rpcCompleteMatch(supabase, {
            matchId:         p.matchId,
            sets:            setsToInsert,
            homeSetsWon,
            awaySetsWon,
            homeLvr:         homeTeamLvr,
            awayLvr:         awayTeamLvr,
            mvpPlayerId:     matchMvpPlayerId,
            loserMvpPlayerId,
            isForfeit:       p.isForfeit || false,
            scheduledAt,
        });

        if (!result.ok) {
            logger.error({ matchId: p.matchId, error: result.error }, "Failed to complete match via RPC");
            return result;
        }

        logger.info({ matchId: p.matchId, homeSetsWon, awaySetsWon, isForfeit: p.isForfeit }, "Match completed successfully");
        return Ok(result.value);
    } catch (error) {
        logger.error({ error }, "Unexpected error completing match");
        return Err(serializeError(error));
    }
}
