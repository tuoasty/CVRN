import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient} from "@/shared/types/db";
import {PlayerAward} from "../types";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";

const AWARD_CATEGORIES = ["individual_winners", "all_star", "first_team", "champion_roster", "staff_team"] as const;

export async function getPlayerAwards(
    supabase: DBClient,
    p: {playerId: string}
): Promise<Result<PlayerAward[]>> {
    try {
        const [awardsRes, teamSeasonsRes] = await Promise.all([
            supabase
                .from("season_awards")
                .select(`
                    id,
                    award_name,
                    category,
                    season_id,
                    awarded_at,
                    sort_order,
                    all_star_team,
                    all_star_slot,
                    all_star_captain,
                    season:seasons!season_id(name, slug, start_date, end_date, region:regions!region_id(code))
                `)
                .eq("player_id", p.playerId)
                .in("category", AWARD_CATEGORIES)
                .order("awarded_at", {ascending: false}),
            supabase
                .from("player_team_seasons")
                .select("team_id, season_id, team:teams!team_id(name, slug, logo_url, logo_bg_removed, deleted_at)")
                .eq("player_id", p.playerId)
                .is("left_at", null)
                .order("joined_at", {ascending: false}),
        ]);

        if (awardsRes.error) {
            logger.error({playerId: p.playerId, error: awardsRes.error}, "Failed to fetch player awards");
            return Err(serializeError(awardsRes.error, "DB_ERROR"));
        }

        const allStarSeasonIds = Array.from(new Set(
            (awardsRes.data ?? []).filter(r => r.category === "all_star").map(r => r.season_id)
        ));
        const allStarNameByKey = new Map<string, string>();
        if (allStarSeasonIds.length > 0) {
            const {data: allStarTeams, error: allStarError} = await supabase
                .from("season_all_star_teams")
                .select("season_id, code, name")
                .in("season_id", allStarSeasonIds);
            if (allStarError) {
                logger.error({playerId: p.playerId, error: allStarError}, "Failed to fetch all-star team names");
            }
            for (const t of allStarTeams ?? []) allStarNameByKey.set(`${t.season_id}::${t.code}`, t.name);
        }

        const teamNameBySeason = new Map<string, string>();
        const teamSlugBySeason = new Map<string, string>();
        const teamLogoUrlBySeason = new Map<string, string | null>();
        const teamLogoBgRemovedBySeason = new Map<string, boolean>();
        const teamDisbandedBySeason = new Map<string, boolean>();
        const playerTeamPairs = new Set<string>();
        const teamIdsBySeason = new Map<string, string>();

        for (const row of teamSeasonsRes.data ?? []) {
            const team = row.team as {name: string; slug: string; logo_url: string | null; logo_bg_removed: boolean; deleted_at: string | null} | null;
            const key = `${row.season_id}::${row.team_id}`;
            playerTeamPairs.add(key);
            if (!teamNameBySeason.has(row.season_id) && team?.name) {
                teamNameBySeason.set(row.season_id, team.name);
                teamSlugBySeason.set(row.season_id, team.slug)
                teamLogoUrlBySeason.set(row.season_id, team.logo_url ?? null);
                teamLogoBgRemovedBySeason.set(row.season_id, team.logo_bg_removed ?? false);
                teamDisbandedBySeason.set(row.season_id, team.deleted_at != null);
                teamIdsBySeason.set(row.season_id, row.team_id);
            }
        }

        const seasonIds = Array.from(new Set(
            (teamSeasonsRes.data ?? []).map(r => r.season_id)
        ));

        let podiumAwards: PlayerAward[] = [];
        if (seasonIds.length > 0) {
            const {data: podiumData} = await supabase
                .from("season_podium")
                .select(`
                    id,
                    place,
                    season_id,
                    team_id,
                    season:seasons!season_id(name, slug, start_date, end_date, region:regions!region_id(code)),
                    team:teams!team_id(name, slug, logo_url, logo_bg_removed, deleted_at)
                `)
                .in("season_id", seasonIds)
                .gte("place", 2);

            const groupCount = new Map<string, number>();
            for (const r of podiumData ?? []) {
                const key = `${r.season_id}::${r.place}`;
                groupCount.set(key, (groupCount.get(key) ?? 0) + 1);
            }

            podiumAwards = (podiumData ?? [])
                .filter(r => playerTeamPairs.has(`${r.season_id}::${r.team_id}`))
                .map(r => {
                    const season = r.season as {name: string; slug: string; start_date: string; end_date: string | null; region: {code: string}} | null;
                    const team = r.team as {name: string; slug: string; logo_url: string | null; logo_bg_removed: boolean; deleted_at: string | null} | null;
                    const groupSize = groupCount.get(`${r.season_id}::${r.place}`) ?? 1;
                    const placeEnd = r.place + groupSize - 1;
                    const category = r.place === 2 ? "runner_up" : r.place === 3 ? "third_place" : "placement";
                    const awardName = r.place === 2 ? "Runner Up" : r.place === 3 ? "Third Place" : "Placement";
                    return {
                        id: r.id,
                        award_name: awardName,
                        category,
                        season_id: r.season_id,
                        season_name: season?.name ?? "",
                        season_slug: season?.slug ?? "",
                        region_code: season?.region?.code ?? "",
                        team_name: team?.name ?? null,
                        team_slug: team?.slug ?? null,
                        team_disbanded: team?.deleted_at != null,
                        awarded_at: season?.end_date ?? null,
                        season_start_date: season?.start_date ?? "",
                        team_logo_url: team?.logo_url ?? null,
                        team_logo_bg_removed: team?.logo_bg_removed ?? false,
                        place: r.place,
                        place_end: placeEnd,
                    };
                });
        }

        const rows: PlayerAward[] = (awardsRes.data ?? []).map(r => {
            const season = r.season as {name: string; slug: string; start_date: string; end_date: string | null; region: {code: string}} | null;
            return {
                id: r.id,
                award_name: r.award_name,
                category: r.category,
                season_id: r.season_id,
                season_name: season?.name ?? "",
                season_slug: season?.slug ?? "",
                region_code: season?.region?.code ?? "",
                team_name: teamNameBySeason.get(r.season_id) ?? null,
                team_slug: teamSlugBySeason.get(r.season_id) ?? null,
                team_disbanded: teamDisbandedBySeason.get(r.season_id) ?? false,
                awarded_at: season?.end_date ?? null,
                season_start_date: season?.start_date ?? "",
                sort_order: r.sort_order,
                all_star_team: r.all_star_team as PlayerAward["all_star_team"],
                all_star_slot: r.all_star_slot as PlayerAward["all_star_slot"],
                all_star_captain: r.all_star_captain,
                all_star_team_name: r.all_star_team
                    ? allStarNameByKey.get(`${r.season_id}::${r.all_star_team}`) ?? `Team ${r.all_star_team}`
                    : null,
                team_logo_url: teamLogoUrlBySeason.get(r.season_id) ?? null,
                team_logo_bg_removed: teamLogoBgRemovedBySeason.get(r.season_id) ?? false,
            };
        });

        return Ok([...rows, ...podiumAwards].sort((a, b) => b.season_start_date.localeCompare(a.season_start_date)));
    } catch (error) {
        logger.error({error, playerId: p.playerId}, "Unexpected error in getPlayerAwards");
        return Err(serializeError(error));
    }
}
