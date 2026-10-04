import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient} from "@/shared/types/db";
import {PlayerSpecEntry} from "../types";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";

export async function getPlayerSpecs(
    supabase: DBClient,
    p: {playerId: string}
): Promise<Result<PlayerSpecEntry[]>> {
    try {
        const [winnersRes, teamSeasonsRes] = await Promise.all([
            supabase
                .from("spec_winners")
                .select(`
                    id,
                    stars_awarded,
                    season_id,
                    spec:specs(name, position, stars),
                    season:seasons!season_id(name, slug, start_date, end_date, region:regions!region_id(code))
                `)
                .eq("player_id", p.playerId),
            supabase
                .from("player_team_seasons")
                .select("season_id, team:teams!team_id(name, slug, logo_url, logo_bg_removed, deleted_at)")
                .eq("player_id", p.playerId)
                .order("joined_at", {ascending: false}),
        ]);

        if (winnersRes.error) {
            logger.error({playerId: p.playerId, error: winnersRes.error}, "Failed to fetch player specs");
            return Err(serializeError(winnersRes.error, "DB_ERROR"));
        }

        const teamBySeason = new Map<string, {name: string; slug: string; logo_url: string | null; logo_bg_removed: boolean; disbanded: boolean}>();
        for (const row of teamSeasonsRes.data ?? []) {
            const team = row.team as {name: string; slug: string; logo_url: string | null; logo_bg_removed: boolean; deleted_at: string | null} | null;
            if (!teamBySeason.has(row.season_id) && team?.name) {
                teamBySeason.set(row.season_id, {
                    name: team.name,
                    slug: team.slug,
                    logo_url: team.logo_url ?? null,
                    logo_bg_removed: team.logo_bg_removed ?? false,
                    disbanded: team.deleted_at != null,
                });
            }
        }

        const rows: PlayerSpecEntry[] = (winnersRes.data ?? [])
            .map(r => {
                const spec = r.spec as {name: string; position: string; stars: number} | null;
                const season = r.season as {name: string; slug: string; start_date: string; end_date: string | null; region: {code: string}} | null;
                if (!spec) return null;
                const team = teamBySeason.get(r.season_id);
                return {
                    id: r.id,
                    spec_name: spec.name,
                    position: spec.position,
                    stars: spec.stars,
                    stars_awarded: r.stars_awarded,
                    dropped: r.stars_awarded < spec.stars,
                    season_id: r.season_id,
                    season_name: season?.name ?? "",
                    season_slug: season?.slug ?? "",
                    region_code: season?.region?.code ?? "",
                    awarded_at: season?.end_date ?? null,
                    season_start_date: season?.start_date ?? "",
                    team_name: team?.name ?? null,
                    team_slug: team?.slug ?? null,
                    team_disbanded: team?.disbanded ?? false,
                    team_logo_url: team?.logo_url ?? null,
                    team_logo_bg_removed: team?.logo_bg_removed ?? false,
                } as PlayerSpecEntry;
            })
            .filter((e): e is PlayerSpecEntry => e !== null)
            .sort((a, b) => b.season_start_date.localeCompare(a.season_start_date));

        return Ok(rows);
    } catch (error) {
        logger.error({error, playerId: p.playerId}, "Unexpected error in getPlayerSpecs");
        return Err(serializeError(error));
    }
}
