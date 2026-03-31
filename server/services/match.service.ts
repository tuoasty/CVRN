import {DBClient, Match, MatchSet, Team} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {
    CompleteMatchInput,
    CreateMatchesInput,
    MatchSetsInput, MatchWithDetails,
    UpdateMatchScheduleInput,
    VoidMatchInput
} from "@/server/dto/match.dto";
import {
    insertMatches,
    findAllMatches,
    findMatchesBySeasonAndWeek,
    updateMatchSchedule,
    updateMatchCompletion,
    insertMatchSets,
    findMatchById,
    deleteMatchSets,
    voidMatch,
    findMatchSets,
    updateMatchResults,
    findMatchesWithDetailsBySeasonAndWeek, deleteMatch, findRecentMatches, findUpcomingMatches, resetDownstreamBrackets
} from "@/server/db/matches.repo";
import {randomUUID} from "node:crypto";
import {convertToUTC, isValidTimezone} from "@/server/utils/timezone";

import {removeAllMatchOfficials} from "@/server/db/matchOfficial.repo";

export async function createMatches(
    supabase: DBClient,
    p: CreateMatchesInput
): Promise<Result<Match[]>> {
    try {
        const teamIds = new Set<string>();

        for (const match of p.matches) {
            if (match.homeId === match.awayId) {
                return Err({
                    name: "ValidationError",
                    message: "Team A and Team B cannot be the same"
                });
            }

            if (teamIds.has(match.homeId) || teamIds.has(match.awayId)) {
                return Err({
                    name: "ValidationError",
                    message: "Duplicate teams found across matches"
                });
            }

            teamIds.add(match.homeId);
            teamIds.add(match.awayId);
        }

        if (p.defaultTimezone && !isValidTimezone(p.defaultTimezone)) {
            return Err({
                name: "ValidationError",
                message: "Invalid default timezone"
            });
        }

        let defaultScheduledAt: string | null = null;
        if (p.defaultScheduledDate && p.defaultScheduledTime && p.defaultTimezone) {
            defaultScheduledAt = convertToUTC(
                p.defaultScheduledDate,
                p.defaultScheduledTime,
                p.defaultTimezone
            );

            if (!defaultScheduledAt) {
                return Err({
                    name: "ValidationError",
                    message: "Invalid default date/time/timezone combination"
                });
            }
        }

        const matchRows = p.matches.map(m => {
            let scheduledAt: string | null = null;

            if (m.scheduledDate && m.scheduledTime && m.timezone) {
                if (!isValidTimezone(m.timezone)) {
                    throw new Error(`Invalid timezone for match: ${m.timezone}`);
                }
                scheduledAt = convertToUTC(m.scheduledDate, m.scheduledTime, m.timezone);
                if (!scheduledAt) {
                    throw new Error(`Invalid date/time/timezone for match`);
                }
            } else if (defaultScheduledAt) {
                scheduledAt = defaultScheduledAt;
            }

            return {
                id: randomUUID(),
                seasonId: p.seasonId,
                homeTeamId: m.homeId,
                awayTeamId: m.awayId,
                week: p.week,
                scheduledAt: scheduledAt,
                status: "pending" as const,
                matchType: "season" as const,
            };
        });

        const {data, error} = await insertMatches(supabase, matchRows);

        if (error) {
            logger.error({input: p, error}, "Failed to insert matches");
            return Err(serializeError(error));
        }

        if (!data) {
            return Err({
                name: "InsertError",
                message: "Failed to create matches"
            });
        }

        return Ok(data as Match[]);
    } catch (error) {
        logger.error({error}, "Unexpected error creating matches");
        return Err(serializeError(error));
    }
}

export async function getAllMatches(supabase: DBClient): Promise<Result<Match[]>> {
    try {
        const {data, error} = await findAllMatches(supabase);

        if (error) {
            logger.error({error}, "Failed to fetch all matches");
            return Err(serializeError(error));
        }

        if (!data) {
            return Err({
                name: "FetchError",
                message: "Failed to fetch matches"
            });
        }

        return Ok(data);
    } catch (error) {
        logger.error({error}, "Unexpected error fetching matches");
        return Err(serializeError(error));
    }
}

export async function getAvailableTeamsForWeek(
    supabase: DBClient,
    p: {
        seasonId: string,
        week: number
    }
): Promise<Result<Team[]>> {
    try {
        const {data: allTeams, error: teamsError} = await supabase
            .from("teams")
            .select("*")
            .eq("season_id", p.seasonId)
            .is("deleted_at", null);

        if (teamsError) {
            logger.error({seasonId:p.seasonId, week:p.week, error: teamsError}, "Failed to fetch teams");
            return Err(serializeError(teamsError));
        }

        if (!allTeams) {
            return Ok([]);
        }

        const {data: matches, error: matchesError} = await supabase
            .from("matches")
            .select("home_team_id, away_team_id")
            .eq("season_id", p.seasonId)
            .eq("match_type", "season")
            .eq("week", p.week);

        if (matchesError) {
            logger.error({seasonId:p.seasonId, week:p.week, error: matchesError}, "Failed to fetch matches for week");
            return Err(serializeError(matchesError));
        }

        const usedTeamIds = new Set<string>();
        if (matches) {
            matches.forEach(m => {
                if (m.home_team_id) {
                    usedTeamIds.add(m.home_team_id);
                }
                if (m.away_team_id) {
                    usedTeamIds.add(m.away_team_id);
                }
            });
        }

        const availableTeams = allTeams.filter(t => !usedTeamIds.has(t.id));

        return Ok(availableTeams as Team[]);
    } catch (error) {
        logger.error({error}, "Unexpected error fetching available teams");
        return Err(serializeError(error));
    }
}

export async function getMatchesForWeek(
    supabase: DBClient,
    p: {
        seasonId: string,
        week: number
    }
): Promise<Result<Match[]>> {
    try {
        const {data, error} = await findMatchesBySeasonAndWeek(supabase, p.seasonId, p.week);

        if (error) {
            logger.error({seasonId: p.seasonId, week: p.week, error}, "Failed to fetch matches for week");
            return Err(serializeError(error));
        }

        if (!data) {
            return Ok([]);
        }

        return Ok(data as Match[]);
    } catch (error) {
        logger.error({error}, "Unexpected error fetching matches for week");
        return Err(serializeError(error));
    }
}

export async function updateMatchScheduleService(
    supabase: DBClient,
    p: UpdateMatchScheduleInput
): Promise<Result<Match>> {
    try {
        let scheduledAt: string | null = null;

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
        }

        const { data, error } = await updateMatchSchedule(
            supabase,
            p.matchId,
            scheduledAt
        );

        if (error) {
            logger.error({ matchId: p.matchId, error }, "Failed to update match schedule");
            return Err(serializeError(error));
        }

        if (!data) {
            return Err({
                name: "UpdateError",
                message: "Failed to update match schedule"
            });
        }

        return Ok(data as Match);
    } catch (error) {
        logger.error({ error }, "Unexpected error updating match schedule");
        return Err(serializeError(error));
    }
}

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

        let homeSetsWon = 0;
        let awaySetsWon = 0;
        let totalHomePoints = 0;
        let totalAwayPoints = 0;
        let homeTeamLvr: number | null = null;
        let awayTeamLvr: number | null = null;
        let setsToInsert = p.sets;
        let matchMvpPlayerId: string | null = p.matchMvpPlayerId || null;
        let loserMvpPlayerId: string | null = p.loserMvpPlayerId || null;

        if (p.isForfeit) {
            if (!p.forfeitingTeam) {
                return Err({
                    name: "ValidationError",
                    message: "Forfeiting team must be specified"
                });
            }

            const minSets = match.best_of === 5 ? 3 : 2;

            if (p.forfeitingTeam === "home") {
                awaySetsWon = minSets;
                homeSetsWon = 0;
            } else {
                homeSetsWon = minSets;
                awaySetsWon = 0;
            }

            setsToInsert = Array.from({ length: minSets }, (_, i) => ({
                setNumber: i + 1,
                homeScore: p.forfeitingTeam === "home" ? 0 : 25,
                awayScore: p.forfeitingTeam === "away" ? 0 : 25,
            }));

            if (match.match_type === "season") {
                if (p.forfeitingTeam === "home") {
                    homeTeamLvr = -10;
                    awayTeamLvr = 5;
                } else {
                    homeTeamLvr = 5;
                    awayTeamLvr = -10;
                }
            }

            matchMvpPlayerId = null;
            loserMvpPlayerId = null;
        } else {
            const expectedMinSets = match.best_of === 5 ? 3 : 2;
            const expectedMaxSets = match.best_of;

            if (p.sets.length < expectedMinSets || p.sets.length > expectedMaxSets) {
                return Err({
                    name: "ValidationError",
                    message: `BO${match.best_of} must have ${expectedMinSets}-${expectedMaxSets} sets`
                });
            }

            for (const set of p.sets) {
                const minWinningScore = set.setNumber === 5 && match.best_of === 5 ? 15 : 25;
                const maxScore = Math.max(set.homeScore, set.awayScore);
                const minScore = Math.min(set.homeScore, set.awayScore);

                if (maxScore < minWinningScore) {
                    return Err({
                        name: "ValidationError",
                        message: `Set ${set.setNumber}: Winning score must be at least ${minWinningScore}`
                    });
                }

                if (maxScore - minScore < 2) {
                    return Err({
                        name: "ValidationError",
                        message: `Set ${set.setNumber}: Winner must win by at least 2 points`
                    });
                }

                if (maxScore < minWinningScore + 2 && minScore >= minWinningScore) {
                    return Err({
                        name: "ValidationError",
                        message: `Set ${set.setNumber}: Invalid deuce score`
                    });
                }
            }

            p.sets.forEach(set => {
                if (set.homeScore > set.awayScore) {
                    homeSetsWon++;
                } else {
                    awaySetsWon++;
                }
                totalHomePoints += set.homeScore;
                totalAwayPoints += set.awayScore;
            });

            const winningTeamId = homeSetsWon > awaySetsWon ? match.home_team_id : match.away_team_id;
            const losingTeamId = homeSetsWon > awaySetsWon ? match.away_team_id : match.home_team_id;

            matchMvpPlayerId = p.matchMvpPlayerId || null;
            loserMvpPlayerId = p.loserMvpPlayerId || null;

            if (match.match_type === "season") {
                const setDiff = homeSetsWon - awaySetsWon;
                const pointDiff = totalHomePoints - totalAwayPoints;

                const normalizedSetDiff = setDiff / 2;
                const normalizedPointDiff = pointDiff / 50;

                const lvrValue = 10 * (0.7 * normalizedSetDiff + 0.3 * normalizedPointDiff);

                homeTeamLvr = lvrValue;
                awayTeamLvr = -lvrValue;
            }
        }

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
                message: "Match not found"
            });
        }

        if (match.status !== "completed") {
            return Err({
                name: "ValidationError",
                message: "Can only void completed matches"
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

export async function getMatchSets(
    supabase: DBClient,
    p: MatchSetsInput
): Promise<Result<MatchSet[]>> {
    try {
        const {data, error} = await findMatchSets(supabase, p.matchId);

        if (error) {
            logger.error({matchId: p.matchId, error}, "Failed to fetch match sets");
            return Err(serializeError(error));
        }

        if (!data) {
            return Ok([]);
        }

        return Ok(data as MatchSet[]);
    } catch (error) {
        logger.error({error}, "Unexpected error fetching match sets");
        return Err(serializeError(error));
    }
}

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

                // Calculate new winner (we'll compute this later, but we need to check now)
                // We'll use the logic from below to determine the new winner
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

        let homeSetsWon = 0;
        let awaySetsWon = 0;
        let totalHomePoints = 0;
        let totalAwayPoints = 0;
        let homeTeamLvr: number | null = null;
        let awayTeamLvr: number | null = null;
        let setsToInsert = p.sets;
        let matchMvpPlayerId: string | null = p.matchMvpPlayerId || null;
        let loserMvpPlayerId: string | null = p.loserMvpPlayerId || null;

        if (p.isForfeit) {
            if (!p.forfeitingTeam) {
                return Err({
                    name: "ValidationError",
                    message: "Forfeiting team must be specified"
                });
            }

            const minSets = match.best_of === 5 ? 3 : 2;

            if (p.forfeitingTeam === "home") {
                awaySetsWon = minSets;
                homeSetsWon = 0;
            } else {
                homeSetsWon = minSets;
                awaySetsWon = 0;
            }

            setsToInsert = Array.from({ length: minSets }, (_, i) => ({
                setNumber: i + 1,
                homeScore: p.forfeitingTeam === "home" ? 0 : 25,
                awayScore: p.forfeitingTeam === "away" ? 0 : 25,
            }));

            if (match.match_type === "season") {
                if (p.forfeitingTeam === "home") {
                    homeTeamLvr = -10;
                    awayTeamLvr = 5;
                } else {
                    homeTeamLvr = 5;
                    awayTeamLvr = -10;
                }
            }

            matchMvpPlayerId = null;
            loserMvpPlayerId = null;
        } else {
            const expectedMinSets = match.best_of === 5 ? 3 : 2;
            const expectedMaxSets = match.best_of;

            if (p.sets.length < expectedMinSets || p.sets.length > expectedMaxSets) {
                return Err({
                    name: "ValidationError",
                    message: `BO${match.best_of} must have ${expectedMinSets}-${expectedMaxSets} sets`
                });
            }

            for (const set of p.sets) {
                const minWinningScore = set.setNumber === 5 && match.best_of === 5 ? 15 : 25;
                const maxScore = Math.max(set.homeScore, set.awayScore);
                const minScore = Math.min(set.homeScore, set.awayScore);

                if (maxScore < minWinningScore) {
                    return Err({
                        name: "ValidationError",
                        message: `Set ${set.setNumber}: Winning score must be at least ${minWinningScore}`
                    });
                }

                if (maxScore - minScore < 2) {
                    return Err({
                        name: "ValidationError",
                        message: `Set ${set.setNumber}: Winner must win by at least 2 points`
                    });
                }

                if (maxScore < minWinningScore + 2 && minScore >= minWinningScore) {
                    return Err({
                        name: "ValidationError",
                        message: `Set ${set.setNumber}: Invalid deuce score`
                    });
                }
            }

            p.sets.forEach(set => {
                if (set.homeScore > set.awayScore) {
                    homeSetsWon++;
                } else {
                    awaySetsWon++;
                }
                totalHomePoints += set.homeScore;
                totalAwayPoints += set.awayScore;
            });

            const winningTeamId = homeSetsWon > awaySetsWon ? match.home_team_id : match.away_team_id;
            const losingTeamId = homeSetsWon > awaySetsWon ? match.away_team_id : match.home_team_id;

            matchMvpPlayerId = p.matchMvpPlayerId || null;
            loserMvpPlayerId = p.loserMvpPlayerId || null;

            if (match.match_type === "season") {
                const setDiff = homeSetsWon - awaySetsWon;
                const pointDiff = totalHomePoints - totalAwayPoints;

                const normalizedSetDiff = setDiff / 2;
                const normalizedPointDiff = pointDiff / 50;

                const lvrValue = 10 * (0.7 * normalizedSetDiff + 0.3 * normalizedPointDiff);

                homeTeamLvr = lvrValue;
                awayTeamLvr = -lvrValue;
            }
        }

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

export async function getWeekSchedule(
    supabase: DBClient,
    p: { seasonId: string; week: number }
): Promise<Result<MatchWithDetails[]>> {
    try {
        const { data, error } = await findMatchesWithDetailsBySeasonAndWeek(supabase, p.seasonId, p.week);

        if (error) {
            logger.error({ seasonId: p.seasonId, week: p.week, error }, "Failed to fetch week schedule");
            return Err(serializeError(error));
        }

        if (!data) {
            return Ok([]);
        }

        const result: MatchWithDetails[] = data.map(row => ({
            match: row as unknown as Match,
            sets: (row.match_sets ?? []) as MatchSet[],
            officials: (row.match_officials ?? []).map((mo: any) => ({
                id: mo.officials.id,
                username: mo.officials.username,
                display_name: mo.officials.display_name,
                avatar_url: mo.officials.avatar_url,
                official_type: mo.official_type,
            })),
        }));

        return Ok(result);
    } catch (error) {
        logger.error({ error }, "Unexpected error fetching week schedule");
        return Err(serializeError(error));
    }
}

import { GetPlayoffScheduleInput } from "@/server/dto/playoff.dto";
import {
    findMatchesWithDetailsBySeasonAndRound, findPlayoffBracketByMatchId,
    findUniquePlayoffRoundsBySeason,
    updateMatchTeam
} from "@/server/db/playoff.repo";

export async function getPlayoffSchedule(
    supabase: DBClient,
    p: GetPlayoffScheduleInput
): Promise<Result<MatchWithDetails[]>> {
    try {
        const { data, error } = await findMatchesWithDetailsBySeasonAndRound(supabase, p.seasonId, p.round);

        if (error) {
            logger.error({ seasonId: p.seasonId, round: p.round, error }, "Failed to fetch playoff schedule");
            return Err(serializeError(error));
        }

        if (!data) {
            return Ok([]);
        }

        const result: MatchWithDetails[] = data.map(row => ({
            match: row.matches as unknown as Match,
            sets: (row.matches.match_sets ?? []) as MatchSet[],
            officials: (row.matches.match_officials ?? []).map((mo: any) => ({
                id: mo.officials.id,
                username: mo.officials.username,
                display_name: mo.officials.display_name,
                avatar_url: mo.officials.avatar_url,
                official_type: mo.official_type,
            })),
        }));

        return Ok(result);
    } catch (error) {
        logger.error({ error }, "Unexpected error fetching playoff schedule");
        return Err(serializeError(error));
    }
}

export async function getAvailablePlayoffRounds(
    supabase: DBClient,
    seasonId: string
): Promise<Result<string[]>> {
    try {
        const { data, error } = await findUniquePlayoffRoundsBySeason(supabase, seasonId);

        if (error) {
            logger.error({ seasonId, error }, "Failed to fetch playoff rounds");
            return Err(serializeError(error));
        }

        if (!data) {
            return Ok([]);
        }

        const uniqueRounds = Array.from(new Set(data.map(r => r.round)));
        return Ok(uniqueRounds);
    } catch (error) {
        logger.error({ error }, "Unexpected error fetching playoff rounds");
        return Err(serializeError(error));
    }
}

async function advancePlayoffWinner(
    supabase: DBClient,
    matchId: string,
    winnerTeamId: string,
    loserTeamId: string
): Promise<Result<void>> {
    try {
        const { data: bracket, error: bracketError } = await findPlayoffBracketByMatchId(supabase, matchId);

        if (bracketError) {
            logger.error({ matchId, error: bracketError }, "Failed to find playoff bracket");
            return Err(serializeError(bracketError));
        }

        if (!bracket) {
            logger.warn({ matchId }, "No bracket entry found for playoff match");
            return Ok(undefined);
        }

        // Get the match to determine which seed corresponds to which team
        const { data: match } = await findMatchById(supabase, matchId);

        if (!match) {
            logger.error({ matchId }, "Match not found for bracket");
            return Err({
                name: "NotFoundError",
                message: "Match not found"
            });
        }

        // Determine which seed belongs to the winner
        let winnerSeed: number | null = null;
        let loserSeed: number | null = null;

        if (match.home_team_id === winnerTeamId && bracket.seed_home !== null) {
            winnerSeed = bracket.seed_home;
            loserSeed = bracket.seed_away;
        } else if (match.away_team_id === winnerTeamId && bracket.seed_away !== null) {
            winnerSeed = bracket.seed_away;
            loserSeed = bracket.seed_home;
        }

        if (bracket.next_bracket_id && bracket.winner_position) {
            const { data: nextBracket, error: nextBracketError } = await supabase
                .from("playoff_brackets")
                .select("match_id")
                .eq("id", bracket.next_bracket_id)
                .single();

            if (nextBracketError || !nextBracket) {
                logger.error({ nextBracketId: bracket.next_bracket_id, error: nextBracketError }, "Failed to find next bracket");
                return Err(serializeError(nextBracketError));
            }

            const { error: updateError } = await updateMatchTeam(
                supabase,
                nextBracket.match_id,
                bracket.winner_position as "home" | "away",
                winnerTeamId
            );

            if (updateError) {
                logger.error({ matchId: nextBracket.match_id, position: bracket.winner_position, error: updateError }, "Failed to advance winner");
                return Err(serializeError(updateError));
            }

            const seedField = bracket.winner_position === "home" ? "seed_home" : "seed_away";
            const { error: seedError } = await supabase
                .from("playoff_brackets")
                .update({ [seedField]: winnerSeed })
                .eq("id", bracket.next_bracket_id);

            if (seedError) {
                logger.error({ bracketId: bracket.next_bracket_id, seedField, error: seedError }, "Failed to update winner seed");
                return Err(serializeError(seedError));
            }

            logger.info({ matchId, winnerTeamId, winnerSeed, nextMatchId: nextBracket.match_id, position: bracket.winner_position }, "Winner advanced to next bracket");
        }

        if (bracket.loser_next_bracket_id && bracket.loser_position) {
            const { data: loserBracket, error: loserBracketError } = await supabase
                .from("playoff_brackets")
                .select("match_id")
                .eq("id", bracket.loser_next_bracket_id)
                .single();

            if (loserBracketError || !loserBracket) {
                logger.error({ loserNextBracketId: bracket.loser_next_bracket_id, error: loserBracketError }, "Failed to find loser bracket");
                return Err(serializeError(loserBracketError));
            }

            const { error: updateError } = await updateMatchTeam(
                supabase,
                loserBracket.match_id,
                bracket.loser_position as "home" | "away",
                loserTeamId
            );

            if (updateError) {
                logger.error({ matchId: loserBracket.match_id, position: bracket.loser_position, error: updateError }, "Failed to advance loser");
                return Err(serializeError(updateError));
            }

            const seedField = bracket.loser_position === "home" ? "seed_home" : "seed_away";
            const { error: seedError } = await supabase
                .from("playoff_brackets")
                .update({ [seedField]: loserSeed })
                .eq("id", bracket.loser_next_bracket_id);

            if (seedError) {
                logger.error({ bracketId: bracket.loser_next_bracket_id, seedField, error: seedError }, "Failed to update loser seed");
                return Err(serializeError(seedError));
            }

            logger.info({ matchId, loserTeamId, loserSeed, thirdPlaceMatchId: loserBracket.match_id, position: bracket.loser_position }, "Loser advanced to third place match");
        }

        return Ok(undefined);
    } catch (error) {
        logger.error({ matchId, error }, "Unexpected error advancing playoff teams");
        return Err(serializeError(error));
    }
}

export async function deleteMatchService(
    supabase: DBClient,
    matchId: string
): Promise<Result<void>> {
    try {
        const { data: match, error: matchError } = await findMatchById(supabase, matchId);

        if (matchError || !match) {
            logger.error({ matchId, error: matchError }, "Match not found");
            return Err({
                name: "NotFoundError",
                message: "Match not found"
            });
        }

        if (match.match_type === "playoffs") {
            return Err({
                name: "ValidationError",
                message: "Playoff matches cannot be deleted"
            });
        }

        if (match.status === "completed") {
            return Err({
                name: "ValidationError",
                message: "Cannot delete completed matches"
            });
        }

        const { error: deleteError } = await deleteMatch(supabase, matchId);

        if (deleteError) {
            logger.error({ matchId, error: deleteError }, "Failed to delete match");
            return Err(serializeError(deleteError));
        }

        logger.info({ matchId, seasonId: match.season_id, week: match.week }, "Match deleted successfully");
        return Ok(undefined);
    } catch (error) {
        logger.error({ error }, "Unexpected error deleting match");
        return Err(serializeError(error));
    }
}

export async function getUpcomingMatches(
    supabase: DBClient,
    seasonId: string,
    limit: number = 5
): Promise<Result<MatchWithDetails[]>> {
    try {
        const { data, error } = await findUpcomingMatches(supabase, seasonId, limit);

        if (error) {
            logger.error({ seasonId, limit, error }, "Failed to fetch upcoming matches");
            return Err(serializeError(error));
        }

        if (!data) {
            return Ok([]);
        }

        const result: MatchWithDetails[] = data.map(row => ({
            match: row as unknown as Match,
            sets: (row.match_sets ?? []) as MatchSet[],
            officials: (row.match_officials ?? []).map((mo: any) => ({
                id: mo.officials.id,
                username: mo.officials.username,
                display_name: mo.officials.display_name,
                avatar_url: mo.officials.avatar_url,
                official_type: mo.official_type,
            })),
        }));

        return Ok(result);
    } catch (error) {
        logger.error({ error }, "Unexpected error fetching upcoming matches");
        return Err(serializeError(error));
    }
}

export async function getRecentMatches(
    supabase: DBClient,
    seasonId: string,
    limit: number = 5
): Promise<Result<MatchWithDetails[]>> {
    try {
        const { data, error } = await findRecentMatches(supabase, seasonId, limit);

        if (error) {
            logger.error({ seasonId, limit, error }, "Failed to fetch recent matches");
            return Err(serializeError(error));
        }

        if (!data) {
            return Ok([]);
        }

        const result: MatchWithDetails[] = data.map(row => ({
            match: row as unknown as Match,
            sets: (row.match_sets ?? []) as MatchSet[],
            officials: (row.match_officials ?? []).map((mo: any) => ({
                id: mo.officials.id,
                username: mo.officials.username,
                display_name: mo.officials.display_name,
                avatar_url: mo.officials.avatar_url,
                official_type: mo.official_type,
            })),
        }));

        return Ok(result);
    } catch (error) {
        logger.error({ error }, "Unexpected error fetching recent matches");
        return Err(serializeError(error));
    }
}