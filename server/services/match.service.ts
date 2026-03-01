import {DBClient, Match, Team} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {CreateMatchesInput} from "@/server/dto/match.dto";
import {insertMatches, findAllMatches, findMatchesBySeasonAndWeek} from "@/server/db/matches.repo";
import {randomUUID} from "node:crypto";

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

        const matchRows = p.matches.map(m => ({
            id: randomUUID(),
            seasonId: p.seasonId,
            homeTeamId: m.homeId,
            awayTeamId: m.awayId,
            week: p.week,
            scheduledAt: m.proposedScheduledAt ?? null,
            status: "pending" as const,
            matchType: "season" as const,
        }));

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