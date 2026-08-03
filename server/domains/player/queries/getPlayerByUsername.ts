import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient} from "@/shared/types/db";
import {PlayerWithCurrentTeam} from "../types";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import { isSeasonActive } from "../../season/helpers/isSeasonActive";

export async function getPlayerByUsername(
    supabase: DBClient,
    p: {username: string}
): Promise<Result<PlayerWithCurrentTeam | null>> {
    try {
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

        const {data: rows} = await supabase
            .from("player_team_seasons")
            .select(`
                team_id,
                team:teams!team_id(name, logo_url, logo_bg_removed, brick_color),
                season:seasons!season_id(name, slug, league_type, end_date, region:regions!region_id(code, name)),
                left_at
            `)
            .eq("player_id", player.id)
            .order("joined_at", {ascending: false});

        const teamCandidates = (rows ?? []).map(r => {
            const team = r.team as {name: string; logo_url: string | null; logo_bg_removed: boolean; brick_color: string | null} | null;
            const season = r.season as { name: string; slug:string; league_type:string; end_date: string | null;
                region: {code: string; name:string} 
            } | null;
            const left_at = r.left_at as string | null;
            return {
                team_id: r.team_id,
                team,
                season,
                left_at,
                active: season ? isSeasonActive(season) : false,
                isMain: season?.league_type === "main",
            };
        });

        const teamRow = 
            teamCandidates.find(t => t.isMain && t.active && !t.left_at) ??
            teamCandidates.find(t => t.active && !t.left_at) ??
            teamCandidates.find(t => t.active) ??
            teamCandidates[0] ??
            null;

        const current_team = teamRow ? {
            team_id: teamRow.team_id,
            team_name: teamRow.team?.name ?? "",
            team_logo_url: teamRow.team?.logo_url ?? null,
            team_logo_bg_removed: teamRow.team?.logo_bg_removed ?? false,
            team_brick_color: teamRow.team?.brick_color ?? null,
            season_name: teamRow.season?.name ?? "",
            region_code: teamRow.season?.region?.code ?? "",
            region_name: teamRow.season?.region?.name ?? "",
        } : null;

        return Ok({...player, current_team});
    } catch (error) {
        logger.error({error, username: p.username}, "Unexpected error in getPlayerByUsername");
        return Err(serializeError(error));
    }
}
