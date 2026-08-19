import {DBClient, Match, MatchSet, Player} from "@/shared/types/db";
import {InsertMatchDto} from "@/server/domains/match";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";

type MatchOfficialJoin = {
    official_type: string;
    players: Pick<Player, "id" | "username" | "display_name" | "avatar_url"> | null;
};

type MatchSetJoin = Pick<MatchSet, "set_number" | "home_score" | "away_score">;

type MatchWithDetails = Match & {
    match_sets: MatchSetJoin[];
    match_officials: MatchOfficialJoin[];
};

export async function insertMatches(
    supabase: DBClient,
    matches: InsertMatchDto[]
): Promise<Result<Match[]>> {
    const rows = matches.map(m => ({
        ...(m.id && {id: m.id}),
        season_id: m.seasonId,
        home_team_id: m.homeTeamId,
        away_team_id: m.awayTeamId,
        week: m.week,
        scheduled_at: m.scheduledAt,
        status: m.status,
        match_type: m.matchType,
        ...(m.matchCode && {match_code: m.matchCode}),
    }));

    const {data, error} = await supabase
        .from("matches")
        .insert(rows)
        .select();
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data ?? []);
}

export async function findAllMatches(supabase: DBClient): Promise<Result<Match[]>> {
    const {data, error} = await supabase.from("matches").select("*");
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data ?? []);
}

export async function findPlayoffMatchesFullBySeason(
    supabase: DBClient,
    seasonId: string
): Promise<Result<Match[]>> {
    const {data, error} = await supabase
        .from("matches")
        .select("*")
        .eq("season_id", seasonId)
        .eq("match_type", "playoffs");
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data ?? []);
}

export async function findMatchById(supabase: DBClient, matchId: string): Promise<Result<Match | null>> {
    const {data, error} = await supabase
        .from("matches")
        .select("*")
        .eq("id", matchId)
        .single();
    if (error) {
        if (error.code === "PGRST116") return Ok(null);
        return Err(serializeError(error, "DB_ERROR"));
    }
    return Ok(data);
}

export async function findMatchesBySeasonAndWeek(
    supabase: DBClient,
    seasonId: string,
    week: number
): Promise<Result<Match[]>> {
    const {data, error} = await supabase
        .from("matches")
        .select("*")
        .eq("season_id", seasonId)
        .eq("week", week)
        .order("scheduled_at", {ascending: true, nullsFirst: false});
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data ?? []);
}

export async function findMatchesByRegionAndSeason(
    supabase: DBClient,
    regionId: string,
    seasonId: string
): Promise<Result<Match[]>> {
    const {data, error} = await supabase
        .from("matches")
        .select("*")
        .eq("region_id", regionId)
        .eq("season_id", seasonId)
        .order("week", {ascending: true});
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data ?? []);
}

export async function updateMatchSchedule(
    supabase: DBClient,
    matchId: string,
    scheduledAt: string | null,
    targetStatus: "pending" | "scheduled" = "scheduled",
): Promise<Result<Match>> {
    const {data: currentMatch, error: readError} = await supabase
        .from("matches")
        .select("status")
        .eq("id", matchId)
        .single();
    if (readError) return Err(serializeError(readError, "DB_ERROR"));

    const updateData: {
        scheduled_at: string | null;
        status?: "pending" | "scheduled" | "completed";
    } = {
        scheduled_at: scheduledAt,
    };

    if (currentMatch?.status !== "completed") {
        updateData.status = targetStatus;
    }

    const {data, error} = await supabase
        .from("matches")
        .update(updateData)
        .eq("id", matchId)
        .select()
        .single();
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data);
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
        homePoints: number | null;
        awayPoints: number | null;
        homeBonus: number | null;
        awayBonus: number | null;
        pointDiff: number | null;
        mvpPlayerId: string | null;
        loserMvpPlayerId: string | null;
        isForfeit: boolean;
        scheduledAt: string | null;
    }
): Promise<Result<Match>> {
    const {data, error} = await supabase.rpc("complete_match", {
        p_match_id:            params.matchId,
        p_sets:                params.sets.map(s => ({set_number: s.setNumber, home_score: s.homeScore, away_score: s.awayScore})),
        p_home_sets_won:       params.homeSetsWon,
        p_away_sets_won:       params.awaySetsWon,
        p_is_forfeit:          params.isForfeit,
        p_home_lvr:            params.homeLvr          ?? undefined,
        p_away_lvr:            params.awayLvr          ?? undefined,
        p_home_points:         params.homePoints       ?? undefined,
        p_away_points:         params.awayPoints       ?? undefined,
        p_home_bonus:          params.homeBonus        ?? undefined,
        p_away_bonus:          params.awayBonus        ?? undefined,
        p_point_diff:          params.pointDiff        ?? undefined,
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
    const {data, error} = await supabase.rpc("void_match", {
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
        homePoints: number | null;
        awayPoints: number | null;
        homeBonus: number | null;
        awayBonus: number | null;
        pointDiff: number | null;
        mvpPlayerId: string | null;
        loserMvpPlayerId: string | null;
        isForfeit: boolean;
    }
): Promise<Result<Match>> {
    const {data, error} = await supabase.rpc("reapply_match_result", {
        p_match_id:            params.matchId,
        p_sets:                params.sets.map(s => ({set_number: s.setNumber, home_score: s.homeScore, away_score: s.awayScore})),
        p_home_sets_won:       params.homeSetsWon,
        p_away_sets_won:       params.awaySetsWon,
        p_is_forfeit:          params.isForfeit,
        p_home_lvr:            params.homeLvr          ?? undefined,
        p_away_lvr:            params.awayLvr          ?? undefined,
        p_home_points:         params.homePoints       ?? undefined,
        p_away_points:         params.awayPoints       ?? undefined,
        p_home_bonus:          params.homeBonus        ?? undefined,
        p_away_bonus:          params.awayBonus        ?? undefined,
        p_point_diff:          params.pointDiff        ?? undefined,
        p_mvp_player_id:       params.mvpPlayerId      ?? undefined,
        p_loser_mvp_player_id: params.loserMvpPlayerId ?? undefined,
    });
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data);
}

export async function findMatchSets(
    supabase: DBClient,
    matchId: string
): Promise<Result<MatchSet[]>> {
    const {data, error} = await supabase
        .from("match_sets")
        .select("*")
        .eq("match_id", matchId)
        .order("set_number", {ascending: true});
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data ?? []);
}

export async function findMatchesWithDetailsBySeasonAndWeek(
    supabase: DBClient,
    seasonId: string,
    week: number
): Promise<Result<MatchWithDetails[]>> {
    const {data, error} = await supabase
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
                players (
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
        .order("created_at", {ascending: true});
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok((data ?? []) as unknown as MatchWithDetails[]);
}

export async function deleteMatch(
    supabase: DBClient,
    matchId: string
): Promise<Result<Match>> {
    const {data, error} = await supabase
        .from("matches")
        .delete()
        .eq("id", matchId)
        .select()
        .single();
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data);
}

export async function deleteSeasonMatchesBySeasonId(
    supabase: DBClient,
    seasonId: string
): Promise<Result<true>> {
    const {error} = await supabase
        .from("matches")
        .delete()
        .eq("season_id", seasonId)
        .eq("match_type", "season");
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(true);
}

export async function findUpcomingMatches(
    supabase: DBClient,
    seasonId: string,
    limit: number
): Promise<Result<MatchWithDetails[]>> {
    const {data, error} = await supabase
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
                players (
                    id,
                    username,
                    display_name,
                    avatar_url
                )
            ),
            playoff_brackets (round)
        `)
        .eq("season_id", seasonId)
        .in("status", ["scheduled", "pending"])
        .not("scheduled_at", "is", null)
        .order("scheduled_at", {ascending: true})
        .limit(limit);
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok((data ?? []) as unknown as MatchWithDetails[]);
}

export async function findRecentMatches(
    supabase: DBClient,
    seasonId: string,
    limit: number
): Promise<Result<MatchWithDetails[]>> {
    const {data, error} = await supabase
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
                players (
                    id,
                    username,
                    display_name,
                    avatar_url
                )
            ),
            playoff_brackets (round)
        `)
        .eq("season_id", seasonId)
        .eq("status", "completed")
        .order("scheduled_at", {ascending: false, nullsFirst: false})
        .limit(limit);
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok((data ?? []) as unknown as MatchWithDetails[]);
}

const WEEK_MATCH_FETCH_BOUND = 60;

export async function findUpcomingWeekMatches(
    supabase: DBClient,
    seasonId: string
): Promise<Result<MatchWithDetails[]>> {
    const {data, error} = await supabase
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
                players (
                    id,
                    username,
                    display_name,
                    avatar_url
                )
            ),
            playoff_brackets (round)
        `)
        .eq("season_id", seasonId)
        .in("status", ["scheduled", "pending"])
        .not("scheduled_at", "is", null)
        .order("week", {ascending: true, nullsFirst: false})
        .order("scheduled_at", {ascending: true})
        .limit(WEEK_MATCH_FETCH_BOUND);
    if (error) return Err(serializeError(error, "DB_ERROR"));
    const rows = data ?? [];
    const nextWeek = rows.length ? rows[0].week : null;
    const filtered = rows.filter((r) => r.week === nextWeek);
    return Ok(filtered as unknown as MatchWithDetails[]);
}

export async function findRecentWeekMatches(
    supabase: DBClient,
    seasonId: string
): Promise<Result<MatchWithDetails[]>> {
    const {data, error} = await supabase
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
                players (
                    id,
                    username,
                    display_name,
                    avatar_url
                )
            ),
            playoff_brackets (round)
        `)
        .eq("season_id", seasonId)
        .eq("status", "completed")
        .order("week", {ascending: false, nullsFirst: false})
        .order("scheduled_at", {ascending: false, nullsFirst: false})
        .limit(WEEK_MATCH_FETCH_BOUND);
    if (error) return Err(serializeError(error, "DB_ERROR"));
    const rows = data ?? [];
    const latestWeek = rows.length ? rows[0].week : null;
    const filtered = rows.filter((r) => r.week === latestWeek);
    return Ok(filtered as unknown as MatchWithDetails[]);
}

export async function findMatchByCode(
    supabase: DBClient,
    code: string,
    seasonId: string
): Promise<Result<Match | null>> {
    const {data, error} = await supabase
        .from("matches")
        .select("*")
        .ilike("match_code", code)
        .eq("season_id", seasonId)
        .maybeSingle();
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data);
}

type PlayoffMatchRow = Pick<Match, "id" | "home_team_id" | "away_team_id" | "match_code" | "scheduled_at" | "status"> & {
    playoff_brackets: { round: string }[];
};

export async function findPlayoffMatchesBySeason(
    supabase: DBClient,
    seasonId: string
): Promise<Result<PlayoffMatchRow[]>> {
    const {data, error} = await supabase
        .from("matches")
        .select(`id, home_team_id, away_team_id, match_code, scheduled_at, status, playoff_brackets (round)`)
        .eq("season_id", seasonId)
        .eq("match_type", "playoffs")
        .order("scheduled_at", {ascending: true, nullsFirst: false});
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok((data ?? []) as unknown as PlayoffMatchRow[]);
}

export async function findWeekMatchCountsBySeason(
    supabase: DBClient,
    seasonId: string
): Promise<Result<{ week: number; total: number; completed: number }[]>> {
    const { data, error } = await supabase
        .from("matches")
        .select("week, status")
        .eq("season_id", seasonId)
        .eq("match_type", "season")
        .not("week", "is", null)
        .order("week", { ascending: true });
    if (error) return Err(serializeError(error, "DB_ERROR"));
    const totals: Record<number, number> = {};
    const completed: Record<number, number> = {};
    for (const { week, status } of data ?? []) {
        if (week == null) continue;
        totals[week] = (totals[week] ?? 0) + 1;
        if (status === "completed") completed[week] = (completed[week] ?? 0) + 1;
    }
    return Ok(Object.keys(totals).map(w => {
        const week = parseInt(w, 10);
        return { week, total: totals[week], completed: completed[week] ?? 0 };
    }));
}

export async function findDefaultWeekForSeason(
    supabase: DBClient,
    seasonId: string
): Promise<Result<number>> {

    const { data: completed, error: completedErr } = await supabase
        .from("matches")
        .select("week")
        .eq("season_id", seasonId)
        .eq("status", "completed")
        .not("week", "is", null)
        .order("week", { ascending: false })
        .limit(1)
        .maybeSingle();
    if (completedErr) return Err(serializeError(completedErr, "DB_ERROR"));
    if (completed?.week != null) return Ok(completed.week);

    const { data: upcoming, error: upcomingErr } = await supabase
        .from("matches")
        .select("week")
        .eq("season_id", seasonId)
        .not("week", "is", null)
        .gte("scheduled_at", new Date().toISOString())
        .order("scheduled_at", { ascending: true })
        .limit(1)
        .maybeSingle();
    if (upcomingErr) return Err(serializeError(upcomingErr, "DB_ERROR"));
    if (upcoming?.week != null) return Ok(upcoming.week);

    const { data: latest, error: latestErr } = await supabase
        .from("matches")
        .select("week")
        .eq("season_id", seasonId)
        .not("week", "is", null)
        .order("week", { ascending: false })
        .limit(1)
        .maybeSingle();
    if (latestErr) return Err(serializeError(latestErr, "DB_ERROR"));
    return Ok(latest?.week ?? 1);
}
