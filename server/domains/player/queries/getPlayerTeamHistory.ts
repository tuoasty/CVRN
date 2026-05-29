import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient} from "@/shared/types/db";
import {PlayerTeamHistoryEntry} from "../types";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";

export async function getPlayerTeamHistory(
    supabase: DBClient,
    p: {playerId: string}
): Promise<Result<PlayerTeamHistoryEntry[]>> {
    try {
        const {data, error} = await supabase
            .from("player_team_seasons")
            .select(`
                role,
                joined_at,
                left_at,
                team:teams!team_id(id, name, logo_url, logo_bg_removed, brick_color, deleted_at),
                season:seasons!season_id(id, name, slug, end_date, region:regions!region_id(code))
            `)
            .eq("player_id", p.playerId)
            .order("joined_at", {ascending: false});

        if (error) {
            logger.error({playerId: p.playerId, error}, "Failed to fetch player team history");
            return Err(serializeError(error, "DB_ERROR"));
        }

        const rows: PlayerTeamHistoryEntry[] = (data ?? []).map(r => {
            const team = r.team as {id: string; name: string; slug: string; logo_url: string | null; logo_bg_removed: boolean; brick_color: string | null; deleted_at: string | null} | null;
            const season = r.season as {id: string; name: string; slug: string; end_date: string | null; region: {code: string}} | null;
            return {
                team_id: team?.id ?? "",
                team_name: team?.name ?? "",
                team_slug: team?.slug ?? "",
                team_logo_url: team?.logo_url ?? null,
                team_logo_bg_removed: team?.logo_bg_removed ?? false,
                team_brick_color: team?.brick_color ?? null,
                team_disbanded: team?.deleted_at != null,
                season_id: season?.id ?? "",
                season_name: season?.name ?? "",
                season_slug: season?.slug ?? "",
                region_code: season?.region?.code ?? "",
                role: r.role as PlayerTeamHistoryEntry["role"],
                joined_at: r.joined_at,
                left_at: r.left_at ?? null,
                season_end_date: season?.end_date ?? null,
            };
        });

        // Deduplicate by (team_id, season_id) — keep the most recent joined_at
        const seen = new Map<string, PlayerTeamHistoryEntry>();
        for (const row of rows) {
            const key = `${row.team_id}::${row.season_id}`;
            const existing = seen.get(key);
            if (!existing || row.joined_at > existing.joined_at) {
                seen.set(key, row);
            }
        }
        const deduped = Array.from(seen.values()).sort((a, b) => b.joined_at.localeCompare(a.joined_at));

        return Ok(deduped);
    } catch (error) {
        logger.error({error, playerId: p.playerId}, "Unexpected error in getPlayerTeamHistory");
        return Err(serializeError(error));
    }
}
