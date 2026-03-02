import {DBClient} from "@/shared/types/db";
import {InsertMatchDto} from "@/server/dto/match.dto";

export async function insertMatches(
    supabase: DBClient,
    matches: InsertMatchDto[]
) {
    const rows = matches.map(m => ({
        ...(m.id && { id: m.id }),
        season_id: m.seasonId,
        home_team_id: m.homeTeamId,
        away_team_id: m.awayTeamId,
        week: m.week,
        scheduled_at: m.scheduledAt,
        status: m.status,
        match_type: m.matchType,
    }));

    return supabase
        .from("matches")
        .insert(rows)
        .select();
}

export async function findAllMatches(supabase: DBClient) {
    return supabase.from("matches").select("*");
}

export async function findMatchById(supabase: DBClient, matchId: string) {
    return supabase
        .from("matches")
        .select("*")
        .eq("id", matchId)
        .single();
}

export async function findMatchesBySeasonAndWeek(
    supabase: DBClient,
    seasonId: string,
    week: number
) {
    return supabase
        .from("matches")
        .select("*")
        .eq("season_id", seasonId)
        .eq("week", week)
        .order("scheduled_at", { ascending: true, nullsFirst: false });
}

export async function findMatchesByRegionAndSeason(
    supabase: DBClient,
    regionId: string,
    seasonId: string
) {
    return supabase
        .from("matches")
        .select("*")
        .eq("region_id", regionId)
        .eq("season_id", seasonId)
        .order("week", { ascending: true });
}

export async function updateMatchSchedule(
    supabase: DBClient,
    matchId: string,
    scheduledAt: string | null
) {
    return supabase
        .from("matches")
        .update({ scheduled_at: scheduledAt })
        .eq("id", matchId)
        .select()
        .single();
}