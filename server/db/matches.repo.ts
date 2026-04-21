import {DBClient, Match} from "@/shared/types/db";
import {InsertMatchDto} from "@/server/domains/match";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";

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

export async function rpcCompleteMatch(
    supabase: DBClient,
    params: {
        matchId: string;
        sets: Array<{ setNumber: number; homeScore: number; awayScore: number }>;
        homeSetsWon: number;
        awaySetsWon: number;
        homeLvr: number | null;
        awayLvr: number | null;
        mvpPlayerId: string | null;
        loserMvpPlayerId: string | null;
        isForfeit: boolean;
        scheduledAt: string | null;
    }
): Promise<Result<Match>> {
    const { data, error } = await supabase.rpc("complete_match", {
        p_match_id:            params.matchId,
        p_sets:                params.sets.map(s => ({ set_number: s.setNumber, home_score: s.homeScore, away_score: s.awayScore })),
        p_home_sets_won:       params.homeSetsWon,
        p_away_sets_won:       params.awaySetsWon,
        p_is_forfeit:          params.isForfeit,
        p_home_lvr:            params.homeLvr          ?? undefined,
        p_away_lvr:            params.awayLvr          ?? undefined,
        p_mvp_player_id:       params.mvpPlayerId      ?? undefined,
        p_loser_mvp_player_id: params.loserMvpPlayerId ?? undefined,
        p_scheduled_at:        params.scheduledAt      ?? undefined,
    });
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data);
}

export async function rpcVoidMatch(
    supabase: DBClient,
    matchId: string
): Promise<Result<Match>> {
    const { data, error } = await supabase.rpc("void_match", {
        p_match_id: matchId,
    });
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data);
}

export async function rpcReapplyMatchResult(
    supabase: DBClient,
    params: {
        matchId: string;
        sets: Array<{ setNumber: number; homeScore: number; awayScore: number }>;
        homeSetsWon: number;
        awaySetsWon: number;
        homeLvr: number | null;
        awayLvr: number | null;
        mvpPlayerId: string | null;
        loserMvpPlayerId: string | null;
        isForfeit: boolean;
    }
): Promise<Result<Match>> {
    const { data, error } = await supabase.rpc("reapply_match_result", {
        p_match_id:            params.matchId,
        p_sets:                params.sets.map(s => ({ set_number: s.setNumber, home_score: s.homeScore, away_score: s.awayScore })),
        p_home_sets_won:       params.homeSetsWon,
        p_away_sets_won:       params.awaySetsWon,
        p_is_forfeit:          params.isForfeit,
        p_home_lvr:            params.homeLvr          ?? undefined,
        p_away_lvr:            params.awayLvr          ?? undefined,
        p_mvp_player_id:       params.mvpPlayerId      ?? undefined,
        p_loser_mvp_player_id: params.loserMvpPlayerId ?? undefined,
    });
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data);
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

export async function findMatchesWithDetailsBySeasonAndWeek(
    supabase: DBClient,
    seasonId: string,
    week: number
) {
    return supabase
        .from("matches")
        .select(`
            *,
            match_sets (
                set_number,
                home_score,
                away_score
            ),
            match_officials (
                official_type,
                officials (
                    id,
                    username,
                    display_name,
                    avatar_url
                )
            )
        `)
        .eq("season_id", seasonId)
        .eq("week", week)
        .eq("match_type", "season")
        .order("created_at", { ascending: true });
}

export async function deleteMatch(
    supabase: DBClient,
    matchId: string
) {
    return supabase
        .from("matches")
        .delete()
        .eq("id", matchId)
        .select()
        .single();
}

export async function findUpcomingMatches(
    supabase: DBClient,
    seasonId: string,
    limit: number
) {
    return supabase
        .from("matches")
        .select(`
            *,
            match_sets (
                set_number,
                home_score,
                away_score
            ),
            match_officials (
                official_type,
                officials (
                    id,
                    username,
                    display_name,
                    avatar_url
                )
            )
        `)
        .eq("season_id", seasonId)
        .in("status", ["scheduled", "pending"])
        .not("scheduled_at", "is", null)
        .order("scheduled_at", { ascending: true })
        .limit(limit);
}

export async function findRecentMatches(
    supabase: DBClient,
    seasonId: string,
    limit: number
) {
    return supabase
        .from("matches")
        .select(`
            *,
            match_sets (
                set_number,
                home_score,
                away_score
            ),
            match_officials (
                official_type,
                officials (
                    id,
                    username,
                    display_name,
                    avatar_url
                )
            )
        `)
        .eq("season_id", seasonId)
        .eq("status", "completed")
        .order("scheduled_at", { ascending: false, nullsFirst: false })
        .limit(limit);
}

