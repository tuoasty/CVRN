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
        const currentLookup = await findPlayerCurrentTeam(supabase, p.currentCaptainPlayerId, p.seasonId);
        if (!currentLookup.ok) {
            logger.error({ currentCaptainPlayerId: p.currentCaptainPlayerId, error: currentLookup.error }, "Failed to look up current captain");
            return currentLookup;
        }
        const currentCaptain = currentLookup.value;
        if (!currentCaptain || currentCaptain.team_id !== p.teamId || currentCaptain.role !== 'captain') {
            logger.error({ currentCaptainPlayerId: p.currentCaptainPlayerId }, "Current captain invalid");
            return Err({
                message: "Current player is not the team captain",
                code: "VALIDATION_ERROR"
            });
        }

        const newLookup = await findPlayerCurrentTeam(supabase, p.newCaptainPlayerId, p.seasonId);
        if (!newLookup.ok) {
            logger.error({ newCaptainPlayerId: p.newCaptainPlayerId, error: newLookup.error }, "Failed to look up new captain");
            return newLookup;
        }
        const newCaptainRecord = newLookup.value;
        if (!newCaptainRecord || newCaptainRecord.team_id !== p.teamId) {
            logger.error({ newCaptainPlayerId: p.newCaptainPlayerId }, "New captain not in team");
            return Err({
                message: "New captain must be in the team",
                code: "NOT_FOUND"
            });
        }

        const demoteResult = await setPlayerRole(supabase, {
            playerId: p.currentCaptainPlayerId,
            teamId: p.teamId,
            seasonId: p.seasonId,
            role: 'player'
        });
        if (!demoteResult.ok) {
            logger.error({ error: demoteResult.error }, "Failed to demote current captain");
            return demoteResult;
        }

        const promoteResult = await setPlayerRole(supabase, {
            playerId: p.newCaptainPlayerId,
            teamId: p.teamId,
            seasonId: p.seasonId,
            role: 'captain'
        });
        if (!promoteResult.ok) {
            logger.error({ error: promoteResult.error }, "Failed to promote new captain");

            await setPlayerRole(supabase, {
                playerId: p.currentCaptainPlayerId,
                teamId: p.teamId,
                seasonId: p.seasonId,
                role: 'captain'
            });

            return promoteResult;
        }

        return Ok({ oldCaptain: demoteResult.value, newCaptain: promoteResult.value });
    } catch (error) {
        logger.error({ error }, "Unexpected error transferring captain");
        return Err(serializeError(error));
    }
}
