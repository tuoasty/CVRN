import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient, PlayerTeamSeason} from "@/shared/types/db";
import {SetPlayerRoleInput} from "../types";
import {serializeError} from "@/server/utils/serializeableError";
import {findPlayerCurrentTeam, findPlayerByRole, setPlayerRole} from "@/server/db/players.repo";
import {logger} from "@/server/utils/logger";

export async function setPlayerRoleService(
    supabase: DBClient,
    p: SetPlayerRoleInput
): Promise<Result<PlayerTeamSeason>> {
    try {
        const { data: currentRecord } = await findPlayerCurrentTeam(supabase, p.playerId, p.seasonId);

        if (!currentRecord || currentRecord.team_id !== p.teamId) {
            logger.error({ playerId: p.playerId, teamId: p.teamId, seasonId: p.seasonId }, "Player not in team");
            return Err({
                name: "PlayerNotInTeam",
                message: "Player is not in this team"
            });
        }

        if (p.role !== 'player') {
            const { data: existingRole } = await findPlayerByRole(supabase, p.teamId, p.seasonId, p.role);

            if (existingRole && existingRole.player_id !== p.playerId) {
                logger.warn({ teamId: p.teamId, seasonId: p.seasonId, role: p.role }, "Role already assigned");
                return Err({
                    name: "RoleAlreadyTaken",
                    message: `This role is already assigned to another player`
                });
            }
        }

        const { data, error } = await setPlayerRole(supabase, p);

        if (error) {
            logger.error({ ...p, error }, "Failed to set player role");
            return Err(serializeError(error));
        }

        if (!data) {
            return Err({
                name: "UpdateError",
                message: "Failed to update player role"
            });
        }

        return Ok(data);
    } catch (error) {
        logger.error({ error }, "Unexpected error setting player role");
        return Err(serializeError(error));
    }
}
