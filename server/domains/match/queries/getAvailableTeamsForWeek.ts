import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient, Team} from "@/shared/types/db";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";

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
