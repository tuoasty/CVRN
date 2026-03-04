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

// In repo layer
export async function updateMatchSchedule(
    supabase: DBClient,
    matchId: string,
    scheduledAt: string | null
) {
    const { data: currentMatch } = await supabase
        .from("matches")
        .select("status")
        .eq("id", matchId)
        .single();

    const updateData: {
        scheduled_at: string | null;
        status?: "pending" | "scheduled" | "completed"
    } = {
        scheduled_at: scheduledAt
    };

    if (scheduledAt && currentMatch?.status !== "completed") {
        updateData.status = "scheduled";
    }

    return supabase
        .from("matches")
        .update(updateData)
        .eq("id", matchId)
        .select()
        .single();
}

export async function insertMatchSets(
    supabase: DBClient,
    matchId: string,
    sets: Array<{ setNumber: number; homeScore: number; awayScore: number }>
) {
    const rows = sets.map(s => ({
        match_id: matchId,
        set_number: s.setNumber,
        home_score: s.homeScore,
        away_score: s.awayScore,
    }));

    return supabase
        .from("match_sets")
        .insert(rows)
        .select();
}

export async function updateMatchCompletion(
    supabase: DBClient,
    matchId: string,
    data: {
        status: "completed";
        homeSetsWon: number;
        awaySetsWon: number;
        homeTeamLvr: number | null;
        awayTeamLvr: number | null;
        matchMvpPlayerId: string;
        loserMvpPlayerId: string;
        scheduledAt?: string | null;
    }
) {
    const updateData: any = {
        status: data.status,
        home_sets_won: data.homeSetsWon,
        away_sets_won: data.awaySetsWon,
        home_team_lvr: data.homeTeamLvr,
        away_team_lvr: data.awayTeamLvr,
        match_mvp_player_id: data.matchMvpPlayerId,
        loser_mvp_player_id: data.loserMvpPlayerId,
    };

    if (data.scheduledAt !== undefined) {
        updateData.scheduled_at = data.scheduledAt;
    }

    return supabase
        .from("matches")
        .update(updateData)
        .eq("id", matchId)
        .select()
        .single();
}

export async function deleteMatchSets(
    supabase: DBClient,
    matchId: string
) {
    return supabase
        .from("match_sets")
        .delete()
        .eq("match_id", matchId);
}

export async function voidMatch(
    supabase: DBClient,
    matchId: string
) {
    return supabase
        .from("matches")
        .update({
            status: "pending",
            scheduled_at: null,
            home_sets_won: 0,
            away_sets_won: 0,
            home_team_lvr: 0,
            away_team_lvr: 0,
            match_mvp_player_id: null,
            loser_mvp_player_id: null
        })
        .eq("id", matchId)
        .select()
        .single();
}

export async function findMatchSets(
    supabase: DBClient,
    matchId: string
) {
    return supabase
        .from("match_sets")
        .select("*")
        .eq("match_id", matchId)
        .order("set_number", { ascending: true });
}

export async function updateMatchResults(
    supabase: DBClient,
    matchId: string,
    data: {
        homeSetsWon: number;
        awaySetsWon: number;
        homeTeamLvr: number | null;
        awayTeamLvr: number | null;
        matchMvpPlayerId: string;
        loserMvpPlayerId: string;
    }
) {
    return supabase
        .from("matches")
        .update({
            home_sets_won: data.homeSetsWon,
            away_sets_won: data.awaySetsWon,
            home_team_lvr: data.homeTeamLvr,
            away_team_lvr: data.awayTeamLvr,
            match_mvp_player_id: data.matchMvpPlayerId,
            loser_mvp_player_id: data.loserMvpPlayerId,
        })
        .eq("id", matchId)
        .select()
        .single();
}