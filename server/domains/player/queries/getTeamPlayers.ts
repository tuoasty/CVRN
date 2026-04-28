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
        const {data, error} = await findAllTeamPlayers(supabase, p.teamId, p.seasonId);
        if (error) {
            logger.error({teamId: p.teamId, seasonId: p.seasonId, error}, "Failed to fetch team players");
            return Err(serializeError(error, "DB_ERROR"));
        }

        if (!data) {
            return Err({
                message: "Failed to fetch team players",
                code: "DB_ERROR"
            });
        }

        const syncedPlayers: PlayerWithRole[] = await Promise.all(
            data
                .filter(record => record.player)
                .map(async (record) => {
                    const result = await lazySyncPlayer(supabase, record.player!);
                    const role: PlayerRole = (record.role as PlayerRole) || 'player';
                    const player = result.ok ? result.value : record.player!;
                    return { ...player, role };
                })
        );

        return Ok(syncedPlayers);
    } catch (error) {
        logger.error({error}, "Unexpected error fetching team players");
        return Err(serializeError(error));
    }
}
