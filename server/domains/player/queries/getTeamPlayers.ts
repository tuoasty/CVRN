import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient} from "@/shared/types/db";
import {TeamPlayersInput, PlayerRole, PlayerWithRole} from "../types";
import {serializeError} from "@/server/utils/serializeableError";
import {findAllTeamPlayers} from "@/server/db/players.repo";
import {lazySyncPlayer} from "../helpers/lazySyncPlayer";
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

        const syncedPlayers: PlayerWithRole[] = await Promise.all(
            result.value
                .filter(record => record.player)
                .map(async (record) => {
                    const syncResult = await lazySyncPlayer(supabase, record.player!);
                    const role: PlayerRole = (record.role as PlayerRole) || 'player';
                    const player = syncResult.ok ? syncResult.value : record.player!;
                    return { ...player, role };
                })
        );

        return Ok(syncedPlayers);
    } catch (error) {
        logger.error({error}, "Unexpected error fetching team players");
        return Err(serializeError(error));
    }
}
