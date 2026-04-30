import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient} from "@/shared/types/db";
import {SearchPlayersInput, PlayerWithTeamInfo} from "../types";
import {serializeError} from "@/server/utils/serializeableError";
import {findPlayerByExactUsername} from "@/server/db/players.repo";
import {logger} from "@/server/utils/logger";

export async function getPlayerByExactUsername(
    supabase: DBClient,
    p: SearchPlayersInput
): Promise<Result<PlayerWithTeamInfo | null>> {
    try {
        const lookup = await findPlayerByExactUsername(supabase, p.query);
        if (!lookup.ok) {
            logger.error({ query: p.query, error: lookup.error }, "Failed to find player by exact username");
            return lookup;
        }
        const player = lookup.value;
        if (!player) {
            return Ok(null);
        }

        const { data: activeTeamSeasons } = await supabase
            .from("player_team_seasons")
            .select(`
                player_id,
                team_id,
                season_id,
                team:teams(name)
            `)
            .eq("player_id", player.id)
            .is("left_at", null)
            .maybeSingle();

        return Ok({
            id: player.id,
            roblox_user_id: player.roblox_user_id,
            username: player.username,
            display_name: player.display_name,
            avatar_url: player.avatar_url,
            current_team_id: activeTeamSeasons?.team_id || null,
            current_season_id: activeTeamSeasons?.season_id || null,
            current_team_name: activeTeamSeasons?.team?.name || null
        });
    } catch (error) {
        logger.error({ error }, "Unexpected error finding player by exact username");
        return Err(serializeError(error));
    }
}
