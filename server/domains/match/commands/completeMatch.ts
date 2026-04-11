import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient, Match} from "@/shared/types/db";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {findMatchById, insertMatchSets, updateMatchCompletion} from "@/server/db/matches.repo";
import {CompleteMatchInput} from "../types";
import {validateAndCalculateMatchResult} from "../helpers/validateAndCalculateMatchResult";
import {convertToUTC, isValidTimezone} from "@/server/utils/timezone";
import {advancePlayoffWinner} from "@/server/domains/playoff";

export async function completeMatchService(
    supabase: DBClient,
    p: CompleteMatchInput
): Promise<Result<Match>> {
    try {
        const { data: match, error: matchError } = await findMatchById(supabase, p.matchId);

        if (matchError || !match) {
            logger.error({ matchId: p.matchId, error: matchError }, "Match not found");
            return Err({
                name: "NotFoundError",
                message: "Match not found"
            });
        }

        if (match.status !== "scheduled") {
            return Err({
                name: "ValidationError",
                message: "Can only complete scheduled matches"
            });
        }

        const calcResult = validateAndCalculateMatchResult(p, match);
        if (!calcResult.ok) return calcResult;
        const { homeSetsWon, awaySetsWon, homeTeamLvr, awayTeamLvr, setsToInsert, matchMvpPlayerId, loserMvpPlayerId } = calcResult.value;

        const { error: setsError } = await insertMatchSets(supabase, p.matchId, setsToInsert);

        if (setsError) {
            logger.error({ matchId: p.matchId, error: setsError }, "Failed to insert match sets");
            return Err(serializeError(setsError));
        }

        let scheduledAt: string | null | undefined = undefined;

        if (p.scheduledDate !== undefined && p.scheduledTime !== undefined && p.timezone !== undefined) {
            if (p.scheduledDate && p.scheduledTime && p.timezone) {
                if (!isValidTimezone(p.timezone)) {
                    return Err({
                        name: "ValidationError",
                        message: "Invalid timezone"
                    });
                }

                scheduledAt = convertToUTC(p.scheduledDate, p.scheduledTime, p.timezone);

                if (!scheduledAt) {
                    return Err({
                        name: "ValidationError",
                        message: "Invalid date/time/timezone combination"
                    });
                }
            } else {
                scheduledAt = null;
            }
        }

        const { data: completedMatch, error: updateError } = await updateMatchCompletion(
            supabase,
            p.matchId,
            {
                status: "completed",
                homeSetsWon,
                awaySetsWon,
                homeTeamLvr,
                awayTeamLvr,
                matchMvpPlayerId,
                loserMvpPlayerId,
                isForfeit: p.isForfeit || false,
                ...(scheduledAt !== undefined && { scheduledAt }),
            }
        );

        if (updateError || !completedMatch) {
            logger.error({ matchId: p.matchId, error: updateError }, "Failed to update match completion");
            return Err(serializeError(updateError));
        }

        if (match.match_type === "playoffs" && match.home_team_id && match.away_team_id) {
            const winnerTeamId = homeSetsWon > awaySetsWon ? match.home_team_id : match.away_team_id;
            const loserTeamId = homeSetsWon > awaySetsWon ? match.away_team_id : match.home_team_id;

            const advanceResult = await advancePlayoffWinner(supabase, p.matchId, winnerTeamId, loserTeamId);

            if (!advanceResult.ok) {
                logger.error({ matchId: p.matchId, error: advanceResult.error }, "Failed to advance playoff teams - match completed but bracket not updated");
            }
        }

        logger.info({ matchId: p.matchId, homeSetsWon, awaySetsWon, isForfeit: p.isForfeit }, "Match completed successfully");

        return Ok(completedMatch as Match);
    } catch (error) {
        logger.error({ error }, "Unexpected error completing match");
        return Err(serializeError(error));
    }
}
