import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient} from "@/shared/types/db";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {findTeamBySlugAndSeasonWithRegion} from "@/server/db/teams.repo";
import {getTeamPlayers} from "@/server/domains/player";
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
                code: "NOT_FOUND"
            });
        }

        const playersResult = await getTeamPlayers(supabase, { teamId: teamData.id, seasonId: p.seasonId });

        if (!playersResult.ok) {
            logger.error({teamId: teamData.id, seasonId: p.seasonId, error: playersResult.error}, "Failed to fetch team players");
            return Err(playersResult.error);
        }

        const playersWithRoles = playersResult.value;

        return Ok({
            team: teamData as TeamWithRegion,
            players: playersWithRoles
        });
    } catch (error) {
        return Err(serializeError(error));
    }
}
