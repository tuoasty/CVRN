import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient, Player} from "@/shared/types/db";
import {TeamPlayersInput, PlayerRole, PlayerWithRole, RosterSpec} from "../types";
import {PositionCode} from "@/shared/volleyball/positions";
import {serializeError} from "@/server/utils/serializeableError";
import {findAllTeamPlayers} from "@/server/db/players.repo";
import {findSpecWinnersBySeasonAndPlayers} from "@/server/db/specWinners.repo";
import {findHeldSpecSeasonId} from "@/server/db/seasons.repo";
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

        const playerIds = records.map(r => (r.player as Player).id);
        const specByPlayer = new Map<string, RosterSpec>();
        const heldSeasonRes = await findHeldSpecSeasonId(supabase, p.seasonId);
        const heldSeasonId = heldSeasonRes.ok ? heldSeasonRes.value : null;
        if (!heldSeasonRes.ok) {
            logger.warn({teamId: p.teamId, seasonId: p.seasonId, error: heldSeasonRes.error}, "Failed to resolve held-spec season");
        }
        if (heldSeasonId && playerIds.length > 0) {
            const specsRes = await findSpecWinnersBySeasonAndPlayers(supabase, heldSeasonId, playerIds);
            if (specsRes.ok) {
                for (const row of specsRes.value) {
                    if (!row.spec) continue;
                    specByPlayer.set(row.player_id, {
                        name: row.spec.name,
                        position: row.spec.position,
                        stars: row.spec.stars,
                        starsAwarded: row.stars_awarded,
                        dropped: row.stars_awarded < row.spec.stars,
                    });
                }
            } else {
                logger.warn({teamId: p.teamId, heldSeasonId, error: specsRes.error}, "Failed to fetch roster specs");
            }
        }

        const withRoles: PlayerWithRole[] = records.map(record => {
            const player = record.player as Player;
            const role: PlayerRole = (record.role as PlayerRole) || 'player';
            return {
                ...player,
                role,
                current_position: (record.position ?? null) as PositionCode | null,
                spec: specByPlayer.get(player.id) ?? null,
            };
        });

        return Ok(withRoles);
    } catch (error) {
        logger.error({error}, "Unexpected error fetching team players");
        return Err(serializeError(error));
    }
}
