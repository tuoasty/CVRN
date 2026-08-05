import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient} from "@/shared/types/db";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {findTeamsByIds} from "@/server/db/teams.repo";
import {TeamWithRegion} from "../types";

type TeamMemberRow = {
    role: string | null;
    player?: {display_name: string | null; avatar_url: string | null} | null;
};

export async function getTeamsByIds(
    supabase: DBClient,
    teamIds: string[]
): Promise<Result<TeamWithRegion[]>> {
    try {
        if (teamIds.length === 0) {
            return Ok([]);
        }

        const result = await findTeamsByIds(supabase, teamIds);
        if (!result.ok) {
            logger.error({teamIds, error: result.error}, "Failed to fetch teams by IDs");
            return result;
        }

        const teamsWithRegions = result.value.map(team => {
            const members: TeamMemberRow[] = (team as {player_team_seasons?: TeamMemberRow[]}).player_team_seasons ?? [];
            const captainRow = members.find(m => m.role === "captain");
            return {
                ...team,
                region: team.seasons.regions,
                captain: captainRow
                    ? {
                        displayName: captainRow.player?.display_name ?? null,
                        avatarUrl: captainRow.player?.avatar_url ?? null,
                      }
                    : null,
            };
        });

        return Ok(teamsWithRegions as TeamWithRegion[]);
    } catch (error) {
        return Err(serializeError(error));
    }
}
