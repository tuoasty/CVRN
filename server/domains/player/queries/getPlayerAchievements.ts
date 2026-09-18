import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient} from "@/shared/types/db";
import {PlayerAchievement} from "../types";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";

export async function getPlayerAchievements(
    supabase: DBClient,
    p: {playerId: string}
): Promise<Result<PlayerAchievement[]>> {
    try {
        const teamSeasonsRes = await supabase
            .from("player_team_seasons")
            .select("team_id, season_id, role")
            .eq("player_id", p.playerId);

        if (teamSeasonsRes.error) {
            logger.error({playerId: p.playerId, error: teamSeasonsRes.error}, "Failed to fetch team seasons for achievements");
            return Err(serializeError(teamSeasonsRes.error, "DB_ERROR"));
        }

        const roleByPair = new Map<string, string>();
        for (const row of teamSeasonsRes.data ?? []) {
            roleByPair.set(`${row.season_id}::${row.team_id}`, row.role ?? "player");
        }
        const seasonIds = Array.from(new Set((teamSeasonsRes.data ?? []).map(r => r.season_id)));
        if (seasonIds.length === 0) return Ok([]);

        const podiumRes = await supabase
            .from("season_podium")
            .select(`
                place, season_id, team_id,
                season:seasons!season_id(name, slug),
                team:teams!team_id(name, slug)
            `)
            .in("season_id", seasonIds)
            .order("season_id")
            .order("place");

        if (podiumRes.error) {
            logger.error({playerId: p.playerId, error: podiumRes.error}, "Failed to fetch season podium for achievements");
            return Err(serializeError(podiumRes.error, "DB_ERROR"));
        }

        const groupCount = new Map<string, number>();
        for (const r of podiumRes.data ?? []) {
            const key = `${r.season_id}::${r.place}`;
            groupCount.set(key, (groupCount.get(key) ?? 0) + 1);
        }

        const achievements: PlayerAchievement[] = (podiumRes.data ?? [])
            .filter(r => roleByPair.has(`${r.season_id}::${r.team_id}`))
            .map(r => {
                const season = r.season as {name: string; slug: string} | null;
                const team = r.team as {name: string; slug: string} | null;
                const groupSize = groupCount.get(`${r.season_id}::${r.place}`) ?? 1;
                return {
                    season_id: r.season_id,
                    season_name: season?.name ?? "",
                    season_slug: season?.slug ?? "",
                    place: r.place,
                    place_end: r.place + groupSize - 1,
                    team_id: r.team_id,
                    team_name: team?.name ?? "",
                    team_slug: team?.slug ?? "",
                    is_captain: roleByPair.get(`${r.season_id}::${r.team_id}`) === "captain",
                };
            });

        return Ok(achievements);
    } catch (error) {
        logger.error({error, playerId: p.playerId}, "Unexpected error in getPlayerAchievements");
        return Err(serializeError(error));
    }
}
