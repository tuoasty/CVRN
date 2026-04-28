import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient, PlayerTeamSeason} from "@/shared/types/db";
import {TransferCaptainInput} from "../types";
import {serializeError} from "@/server/utils/serializeableError";
import {findPlayerCurrentTeam, setPlayerRole} from "@/server/db/players.repo";
import {logger} from "@/server/utils/logger";

export async function transferCaptainService(
    supabase: DBClient,
    p: TransferCaptainInput
): Promise<Result<{ oldCaptain: PlayerTeamSeason, newCaptain: PlayerTeamSeason }>> {
    try {
        const { data: currentCaptain } = await findPlayerCurrentTeam(supabase, p.currentCaptainPlayerId, p.seasonId);

        if (!currentCaptain || currentCaptain.team_id !== p.teamId || currentCaptain.role !== 'captain') {
            logger.error({ currentCaptainPlayerId: p.currentCaptainPlayerId }, "Current captain invalid");
            return Err({
                message: "Current player is not the team captain",
                code: "VALIDATION_ERROR"
            });
        }

        const { data: newCaptainRecord } = await findPlayerCurrentTeam(supabase, p.newCaptainPlayerId, p.seasonId);

        if (!newCaptainRecord || newCaptainRecord.team_id !== p.teamId) {
            logger.error({ newCaptainPlayerId: p.newCaptainPlayerId }, "New captain not in team");
            return Err({
                message: "New captain must be in the team",
                code: "NOT_FOUND"
            });
        }

        const { data: oldCaptain, error: demoteError } = await setPlayerRole(supabase, {
            playerId: p.currentCaptainPlayerId,
            teamId: p.teamId,
            seasonId: p.seasonId,
            role: 'player'
        });

        if (demoteError || !oldCaptain) {
            logger.error({ error: demoteError }, "Failed to demote current captain");
            return Err(serializeError(demoteError, "DB_ERROR"));
        }

        const { data: newCaptain, error: promoteError } = await setPlayerRole(supabase, {
            playerId: p.newCaptainPlayerId,
            teamId: p.teamId,
            seasonId: p.seasonId,
            role: 'captain'
        });

        if (promoteError || !newCaptain) {
            logger.error({ error: promoteError }, "Failed to promote new captain");

            await setPlayerRole(supabase, {
                playerId: p.currentCaptainPlayerId,
                teamId: p.teamId,
                seasonId: p.seasonId,
                role: 'captain'
            });

            return Err(serializeError(promoteError, "DB_ERROR"));
        }

        return Ok({ oldCaptain, newCaptain });
    } catch (error) {
        logger.error({ error }, "Unexpected error transferring captain");
        return Err(serializeError(error));
    }
}
