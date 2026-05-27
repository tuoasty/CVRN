import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient} from "@/shared/types/db";
import {PlayerWithCurrentTeam} from "../types";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";

export async function getPlayerByUsername(
    supabase: DBClient,
    p: {username: string}
): Promise<Result<PlayerWithCurrentTeam | null>> {
    try {
        // 1. Fetch full player row (ilike = case-insensitive match)
        const {data: player, error: playerError} = await supabase
            .from("players")
            .select("*")
            .ilike("username", p.username)
            .maybeSingle();

        if (playerError) {
            logger.error({username: p.username, error: playerError}, "Failed to fetch player by username");
            return Err(serializeError(playerError, "DB_ERROR"));
        }
        if (!player) return Ok(null);

        // 2. Try to find active team first (left_at IS NULL)
        const {data: activeTeam} = await supabase
            .from("player_team_seasons")
            .select(`
                team_id,
                team:teams!team_id(name, logo_url, logo_bg_removed, brick_color),
                season:seasons!season_id(name, slug, region:regions!region_id(code, name))
            `)
            .eq("player_id", player.id)
            .is("left_at", null)
            .order("joined_at", {ascending: false})
            .limit(1)
            .maybeSingle();

        // 3. Fallback: most recent team if no active team
        const teamRow = activeTeam ?? await (async () => {
            const {data} = await supabase
                .from("player_team_seasons")
                .select(`
                    team_id,
                    team:teams!team_id(name, logo_url, logo_bg_removed, brick_color),
                    season:seasons!season_id(name, slug, region:regions!region_id(code, name))
                `)
                .eq("player_id", player.id)
                .order("joined_at", {ascending: false})
                .limit(1)
                .maybeSingle();
            return data;
        })();

        // 4. Map to PlayerWithCurrentTeam
        const current_team = teamRow ? {
            team_id: teamRow.team_id,
            team_name: (teamRow.team as {name: string} | null)?.name ?? "",
            team_logo_url: (teamRow.team as {logo_url: string | null} | null)?.logo_url ?? null,
            team_logo_bg_removed: (teamRow.team as {logo_bg_removed: boolean} | null)?.logo_bg_removed ?? false,
            team_brick_color: (teamRow.team as {brick_color: string | null} | null)?.brick_color ?? null,
            season_name: (teamRow.season as {name: string} | null)?.name ?? "",
            region_code: ((teamRow.season as {region: {code: string}} | null)?.region?.code) ?? "",
            region_name: ((teamRow.season as {region: {name: string}} | null)?.region?.name) ?? "",
        } : null;

        return Ok({...player, current_team});
    } catch (error) {
        logger.error({error, username: p.username}, "Unexpected error in getPlayerByUsername");
        return Err(serializeError(error));
    }
}
