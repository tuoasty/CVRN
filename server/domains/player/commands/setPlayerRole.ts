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
        const currentLookup = await findPlayerCurrentTeam(supabase, p.playerId, p.seasonId);
        if (!currentLookup.ok) {
            logger.error({ playerId: p.playerId, error: currentLookup.error }, "Failed to look up player team");
            return currentLookup;
        }
        const currentRecord = currentLookup.value;
        if (!currentRecord || currentRecord.team_id !== p.teamId) {
            logger.error({ playerId: p.playerId, teamId: p.teamId, seasonId: p.seasonId }, "Player not in team");
            return Err({
                message: "Player is not in this team",
                code: "NOT_FOUND"
            });
        }

        if (p.role !== 'player') {
            const roleLookup = await findPlayerByRole(supabase, p.teamId, p.seasonId, p.role);
            if (!roleLookup.ok) {
                logger.error({ teamId: p.teamId, seasonId: p.seasonId, role: p.role, error: roleLookup.error }, "Failed to look up role assignment");
                return roleLookup;
            }
            const existingRole = roleLookup.value;
            if (existingRole && existingRole.player_id !== p.playerId) {
                logger.warn({ teamId: p.teamId, seasonId: p.seasonId, role: p.role }, "Role already assigned");
                return Err({
                    message: `This role is already assigned to another player`,
                    code: "CONFLICT"
                });
            }
        }

        const result = await setPlayerRole(supabase, p);
        if (!result.ok) {
            logger.error({ ...p, error: result.error }, "Failed to set player role");
            return result;
        }
        return Ok(result.value);
    } catch (error) {
        logger.error({ error }, "Unexpected error setting player role");
        return Err(serializeError(error));
    }
}
