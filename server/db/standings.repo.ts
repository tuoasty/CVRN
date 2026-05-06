import { DBClient } from "@/shared/types/db";
import { GetStandingsInput } from "@/server/domains/standing";

export async function findStandingsBySeasonAndRegion(
    supabase: DBClient,
    p: GetStandingsInput
) {
    let query = supabase
        .from("standings")
        .select("*");

    if (p.seasonId) {
        query = query.eq("season_id", p.seasonId);
    }

    if (p.regionId) {
        query = query.eq("region_id", p.regionId);
    }

    if (p.sortMode === "wins") {
        query = query
            .order("wins", { ascending: false })
            .order("sets_won", { ascending: false })
            .order("total_lvr", { ascending: false });
    } else {
        query = query.order("total_lvr", { ascending: false });
    }

    return query;
}