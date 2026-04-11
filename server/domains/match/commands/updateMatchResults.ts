import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient, Match} from "@/shared/types/db";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {findMatchById, deleteMatchSets, insertMatchSets, updateMatchResults, resetDownstreamBrackets} from "@/server/db/matches.repo";
import {findPlayoffBracketByMatchId} from "@/server/db/playoff.repo";
import {CompleteMatchInput} from "../types";
import {validateAndCalculateMatchResult} from "../helpers/validateAndCalculateMatchResult";
import {advancePlayoffWinner} from "@/server/domains/playoff";

export async function updateMatchResultsService(
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

        if (match.status !== "completed") {
            return Err({
                name: "ValidationError",
                message: "Can only update results for completed matches"
            });
        }
        if (match.match_type === "playoffs") {
            const { data: bracket, error: bracketError } = await findPlayoffBracketByMatchId(supabase, p.matchId);

            if (bracketError) {
                logger.error({ matchId: p.matchId, error: bracketError }, "Failed to find playoff bracket");
                return Err(serializeError(bracketError));
            }

            if (bracket) {
                // Calculate old and new winners to detect if winner changed
                const oldHomeSetsWon = match.home_sets_won ?? 0;
                const oldAwaySetsWon = match.away_sets_won ?? 0;
                const oldWinnerTeamId = oldHomeSetsWon > oldAwaySetsWon ? match.home_team_id : match.away_team_id;

                let newHomeSetsWon = 0;
                let newAwaySetsWon = 0;

                if (p.isForfeit) {
                    const minSets = match.best_of === 5 ? 3 : 2;
                    if (p.forfeitingTeam === "home") {
                        newAwaySetsWon = minSets;
                    } else {
                        newHomeSetsWon = minSets;
                    }
                } else {
                    p.sets.forEach(set => {
                        if (set.homeScore > set.awayScore) {
                            newHomeSetsWon++;
                        } else {
                            newAwaySetsWon++;
                        }
                    });
                }

                const newWinnerTeamId = newHomeSetsWon > newAwaySetsWon ? match.home_team_id : match.away_team_id;

                // Only reset if winner changed
                if (oldWinnerTeamId !== newWinnerTeamId) {
                    const resetResult = await resetDownstreamBrackets(supabase, bracket.id);

                    if (!resetResult.ok) {
                        logger.error({ matchId: p.matchId, error: resetResult.error }, "Failed to reset downstream brackets");
                        return Err(resetResult.error);
                    }

                    logger.info({
                        matchId: p.matchId,
                        bracketId: bracket.id,
                        oldWinner: oldWinnerTeamId,
                        newWinner: newWinnerTeamId
                    }, "Downstream brackets reset due to winner change");
                } else {
                    logger.info({ matchId: p.matchId, bracketId: bracket.id }, "Winner unchanged, skipping downstream reset");
                }
            }
        }

        const calcResult = validateAndCalculateMatchResult(p, match);
        if (!calcResult.ok) return calcResult;
        const { homeSetsWon, awaySetsWon, homeTeamLvr, awayTeamLvr, setsToInsert, matchMvpPlayerId, loserMvpPlayerId } = calcResult.value;

        const { error: deleteSetsError } = await deleteMatchSets(supabase, p.matchId);
        if (deleteSetsError) {
            logger.error({ matchId: p.matchId, error: deleteSetsError }, "Failed to delete existing match sets");
            return Err(serializeError(deleteSetsError));
        }

        const { error: setsError } = await insertMatchSets(supabase, p.matchId, setsToInsert);
        if (setsError) {
            logger.error({ matchId: p.matchId, error: setsError }, "Failed to insert match sets");
            return Err(serializeError(setsError));
        }

        const { data: updatedMatch, error: updateError } = await updateMatchResults(
            supabase,
            p.matchId,
            {
                homeSetsWon,
                awaySetsWon,
                homeTeamLvr,
                awayTeamLvr,
                matchMvpPlayerId,
                loserMvpPlayerId,
                isForfeit: p.isForfeit || false,
            }
        );

        if (updateError || !updatedMatch) {
            logger.error({ matchId: p.matchId, error: updateError }, "Failed to update match results");
            return Err(serializeError(updateError));
        }

        if (match.match_type === "playoffs" && match.home_team_id && match.away_team_id) {
            const winnerTeamId = homeSetsWon > awaySetsWon ? match.home_team_id : match.away_team_id;
            const loserTeamId = homeSetsWon > awaySetsWon ? match.away_team_id : match.home_team_id;

            const advanceResult = await advancePlayoffWinner(supabase, p.matchId, winnerTeamId, loserTeamId);

            if (!advanceResult.ok) {
                logger.error({ matchId: p.matchId, error: advanceResult.error }, "Failed to re-cascade playoff teams after update");
            }
        }


        logger.info({ matchId: p.matchId, homeSetsWon, awaySetsWon, isForfeit: p.isForfeit }, "Match results updated successfully");

        return Ok(updatedMatch as Match);
    } catch (error) {
        logger.error({ error }, "Unexpected error updating match results");
        return Err(serializeError(error));
    }
}
