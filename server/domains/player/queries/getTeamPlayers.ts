import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient, Player} from "@/shared/types/db";
import {TeamPlayersInput, PlayerRole, PlayerWithRole} from "../types";
import {serializeError} from "@/server/utils/serializeableError";
import {findAllTeamPlayers} from "@/server/db/players.repo";
import {logger} from "@/server/utils/logger";

export async function getTeamPlayers(
    supabase: DBClient,
    p: TeamPlayersInput
): Promise<Result<PlayerWithRole[]>> {
    try {
        const result = await findAllTeamPlayers(supabase, p.teamId, p.seasonId);
        if (!result.ok) {
            logger.error({teamId: p.teamId, seasonId: p.seasonId, error: result.error}, "Failed to fetch team players");
            return result;
        }

        const records = result.value.filter(r => r.player);

        // Roblox profile sync deliberately does NOT run here. This backs the public team
        // page, where every concurrent viewer of a stale roster fired the same outbound
        // Roblox calls — batchSyncPlayers filters for staleness but never claims the work,
        // so N viewers meant N identical syncs. Freshness is owned by the sync-players
        // cron; admin write paths still sync eagerly.
        const withRoles: PlayerWithRole[] = records.map(record => {
            const role: PlayerRole = (record.role as PlayerRole) || 'player';
            return {...(record.player as Player), role};
        });

        return Ok(withRoles);
    } catch (error) {
        logger.error({error}, "Unexpected error fetching team players");
        return Err(serializeError(error));
    }
}
