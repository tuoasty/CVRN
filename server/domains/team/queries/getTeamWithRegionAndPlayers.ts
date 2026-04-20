import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient} from "@/shared/types/db";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {findTeamBySlugAndSeasonWithRegion} from "@/server/db/teams.repo";
import {findAllTeamPlayers} from "@/server/db/players.repo";
import {PlayerRole} from "@/server/dto/player.dto";
import {TeamWithRegion, TeamWithRegionAndPlayers} from "../types";

export async function getTeamWithRegionAndPlayers(supabase: DBClient, p: {
    slug: string;
    seasonId: string;
}): Promise<Result<TeamWithRegionAndPlayers>> {
    try {
        const {data: teamData, error: teamError} = await findTeamBySlugAndSeasonWithRegion(supabase, p);

        if (teamError) {
            logger.error({slug: p.slug, seasonId: p.seasonId, error: teamError}, "Failed to fetch team with region");
            return Err(serializeError(teamError, "DB_ERROR"));
        }

        if (!teamData) {
            return Err({
                message: "Team not found",
                name: "NotFoundError",
                code: "NOT_FOUND"
            });
        }

        const {data: playersData, error: playersError} = await findAllTeamPlayers(supabase, teamData.id, p.seasonId);

        if (playersError) {
            logger.error({teamId: teamData.id, seasonId: p.seasonId, error: playersError}, "Failed to fetch team players");
            return Err(serializeError(playersError, "DB_ERROR"));
        }

        const playersWithRoles = playersData?.map(record => ({
            ...record.player,
            role: (record.role || 'player') as PlayerRole
        })) || [];

        return Ok({
            team: teamData as TeamWithRegion,
            players: playersWithRoles
        });
    } catch (error) {
        return Err(serializeError(error));
    }
}
