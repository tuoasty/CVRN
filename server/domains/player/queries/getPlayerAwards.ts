import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient} from "@/shared/types/db";
import {PlayerAward} from "../types";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";

const AWARD_CATEGORIES = ["individual_winners", "first_team", "champion_roster", "staff_team"] as const;

export async function getPlayerAwards(
    supabase: DBClient,
    p: {playerId: string}
): Promise<Result<PlayerAward[]>> {
    try {
        // Fetch season_awards and player_team_seasons in parallel
        const [awardsRes, teamSeasonsRes] = await Promise.all([
            supabase
                .from("season_awards")
                .select(`
                    id,
                    award_name,
                    category,
                    season_id,
                    awarded_at,
                    season:seasons!season_id(name, region:regions!region_id(code))
                `)
                .eq("player_id", p.playerId)
                .in("category", AWARD_CATEGORIES)
                .order("awarded_at", {ascending: false}),
            supabase
                .from("player_team_seasons")
                .select("team_id, season_id, team:teams!team_id(name)")
                .eq("player_id", p.playerId)
                .order("joined_at", {ascending: false}),
        ]);

        if (awardsRes.error) {
            logger.error({playerId: p.playerId, error: awardsRes.error}, "Failed to fetch player awards");
            return Err(serializeError(awardsRes.error, "DB_ERROR"));
        }

        // Build (season_id → team_name) map from most recent join per season
        const teamNameBySeason = new Map<string, string>();
        // Also build a set of unique (season_id::team_id) for podium lookup
        const playerTeamPairs = new Set<string>();
        const teamIdsBySeason = new Map<string, string>(); // season_id → team_id

        for (const row of teamSeasonsRes.data ?? []) {
            const team = row.team as {name: string} | null;
            const key = `${row.season_id}::${row.team_id}`;
            playerTeamPairs.add(key);
            if (!teamNameBySeason.has(row.season_id) && team?.name) {
                teamNameBySeason.set(row.season_id, team.name);
                teamIdsBySeason.set(row.season_id, row.team_id);
            }
        }

        // Fetch podium finishes (places 2–3) for the player's teams
        const allTeamIds = Array.from(new Set(
            (teamSeasonsRes.data ?? []).map(r => r.team_id)
        ));

        let podiumAwards: PlayerAward[] = [];
        if (allTeamIds.length > 0) {
            const {data: podiumData} = await supabase
                .from("season_podium")
                .select(`
                    id,
                    place,
                    season_id,
                    team_id,
                    season:seasons!season_id(name, region:regions!region_id(code)),
                    team:teams!team_id(name)
                `)
                .in("team_id", allTeamIds)
                .in("place", [2, 3]);

            podiumAwards = (podiumData ?? [])
                .filter(r => playerTeamPairs.has(`${r.season_id}::${r.team_id}`))
                .map(r => {
                    const season = r.season as {name: string; region: {code: string}} | null;
                    const team = r.team as {name: string} | null;
                    return {
                        id: r.id,
                        award_name: r.place === 2 ? "Runner Up" : "Third Place",
                        category: r.place === 2 ? "runner_up" : "third_place",
                        season_id: r.season_id,
                        season_name: season?.name ?? "",
                        region_code: season?.region?.code ?? "",
                        team_name: team?.name ?? null,
                    };
                });
        }

        // Map season_awards rows
        const rows: PlayerAward[] = (awardsRes.data ?? []).map(r => {
            const season = r.season as {name: string; region: {code: string}} | null;
            return {
                id: r.id,
                award_name: r.award_name,
                category: r.category,
                season_id: r.season_id,
                season_name: season?.name ?? "",
                region_code: season?.region?.code ?? "",
                team_name: r.category === "champion_roster" ? (teamNameBySeason.get(r.season_id) ?? null) : null,
            };
        });

        // Combine: season_awards first (already ordered by awarded_at), then podium finishes
        return Ok([...rows, ...podiumAwards]);
    } catch (error) {
        logger.error({error, playerId: p.playerId}, "Unexpected error in getPlayerAwards");
        return Err(serializeError(error));
    }
}
