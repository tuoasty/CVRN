import {DBClient, Match, MatchSet, Team} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {
    CompleteMatchInput,
    CreateMatchesInput,
    MatchSetsInput,
    UpdateMatchScheduleInput,
    VoidMatchInput
} from "@/server/dto/match.dto";
import {
    insertMatches,
    findAllMatches,
    findMatchesBySeasonAndWeek,
    updateMatchSchedule,
    updateMatchCompletion, insertMatchSets, findMatchById, deleteMatchSets, voidMatch, findMatchSets
} from "@/server/db/matches.repo";
import {randomUUID} from "node:crypto";
import {convertToUTC, isValidTimezone} from "@/server/utils/timezone";
import {findActivePlayerTeamSeasons} from "@/server/db/players.repo";
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
            .eq("week", p.week);

        if (matchesError) {
            logger.error({seasonId:p.seasonId, week:p.week, error: teamsError}, "Failed to fetch matches for week");
            return Err(serializeError(matchesError));
        }

        const usedTeamIds = new Set<string>();
        if (matches) {
            matches.forEach(m => {
                usedTeamIds.add(m.home_team_id);
                usedTeamIds.add(m.away_team_id);
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

        let homeSetsWon = 0;
        let awaySetsWon = 0;
        let totalHomePoints = 0;
        let totalAwayPoints = 0;

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

        const { data: playerTeamSeasons, error: ptsError } = await findActivePlayerTeamSeasons(
            supabase,
            [p.matchMvpPlayerId, p.loserMvpPlayerId]
        );

        if (ptsError) {
            logger.error({ playerIds: [p.matchMvpPlayerId, p.loserMvpPlayerId], error: ptsError }, "Failed to fetch player team assignments");
            return Err(serializeError(ptsError));
        }

        if (!playerTeamSeasons || playerTeamSeasons.length !== 2) {
            return Err({
                name: "ValidationError",
                message: "One or both MVP players are not currently rostered on any team"
            });
        }

        const matchMvpTeam = playerTeamSeasons.find(pts => pts.player_id === p.matchMvpPlayerId);
        const loserMvpTeam = playerTeamSeasons.find(pts => pts.player_id === p.loserMvpPlayerId);

        if (!matchMvpTeam || !loserMvpTeam) {
            return Err({
                name: "ValidationError",
                message: "Could not find team assignments for MVP players"
            });
        }

        if (matchMvpTeam.team_id !== winningTeamId) {
            return Err({
                name: "ValidationError",
                message: "Match MVP must be from the winning team"
            });
        }

        if (loserMvpTeam.team_id !== losingTeamId) {
            return Err({
                name: "ValidationError",
                message: "Loser MVP must be from the losing team"
            });
        }

        let homeTeamLvr: number | null = null;
        let awayTeamLvr: number | null = null;

        if (match.match_type === "season") {
            const setDiff = homeSetsWon - awaySetsWon;
            const pointDiff = totalHomePoints - totalAwayPoints;

            const normalizedSetDiff = setDiff / 2;
            const normalizedPointDiff = pointDiff / 50;

            const lvrValue = 10 * (0.7 * normalizedSetDiff + 0.3 * normalizedPointDiff);

            homeTeamLvr = lvrValue;
            awayTeamLvr = -lvrValue;
        }

        const { error: setsError } = await insertMatchSets(supabase, p.matchId, p.sets);

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
                matchMvpPlayerId: p.matchMvpPlayerId,
                loserMvpPlayerId: p.loserMvpPlayerId,
                ...(scheduledAt !== undefined && { scheduledAt }),
            }
        );

        if (updateError || !completedMatch) {
            logger.error({ matchId: p.matchId, error: updateError }, "Failed to update match completion");
            return Err(serializeError(updateError));
        }

        logger.info({ matchId: p.matchId, homeSetsWon, awaySetsWon }, "Match completed successfully");

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