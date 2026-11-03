import {DBClient, Match, MatchSet, Player} from "@/shared/types/db";
import {InsertMatchDto, MatchSitemapRow} from "@/server/domains/match";
import type {PlayerMatchCandidate, PlayerMatchSide, PlayerRosterWindow} from "@/server/domains/match";
import type {DashboardMatchRow} from "@/server/domains/admin/types/dashboard";
import {Err, Ok, Result} from "@/shared/types/result";
import {createError, serializeError} from "@/server/utils/serializeableError";

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

const SITEMAP_PAGE_SIZE = 1000;

export async function findCompletedMatchSitemapRows(supabase: DBClient): Promise<Result<MatchSitemapRow[]>> {
    const rows: MatchSitemapRow[] = [];
    for (let from = 0; ; from += SITEMAP_PAGE_SIZE) {
        const {data, error} = await supabase
            .from("matches")
            .select("match_code, season_id, home_team_id, away_team_id, updated_at")
            .eq("status", "completed")
            .not("match_code", "is", null)
            .order("id", {ascending: true})
            .range(from, from + SITEMAP_PAGE_SIZE - 1);
        if (error) return Err(serializeError(error, "DB_ERROR"));
        rows.push(...(data ?? []));
        if (!data || data.length < SITEMAP_PAGE_SIZE) return Ok(rows);
    }
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

export async function rpcReadvancePlayoffMatch(
    supabase: DBClient,
    matchId: string
): Promise<Result<Match>> {
    const {data, error} = await supabase.rpc("readvance_playoff_match", {
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
        .or("status.eq.scheduled,and(status.eq.pending,home_team_id.not.is.null,away_team_id.not.is.null)")
        .order("scheduled_at", {ascending: true, nullsFirst: false})
        .order("week", {ascending: true, nullsFirst: false})
        .order("created_at", {ascending: true})
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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function findMatchesByTeam(
    supabase: DBClient,
    teamId: string,
    seasonId: string
): Promise<Result<MatchWithDetails[]>> {
    if (!UUID_RE.test(teamId)) {
        return Err(createError("Invalid teamId", "VALIDATION_ERROR"));
    }

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
        .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
        .order("scheduled_at", {ascending: false, nullsFirst: false})
        .order("week", {ascending: false, nullsFirst: false})
        .order("created_at", {ascending: false});
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok((data ?? []) as unknown as MatchWithDetails[]);
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

type DashboardMatchQueryRow = Omit<DashboardMatchRow, "playoff_round"> & {
    playoff_brackets: {round: string} | {round: string}[] | null;
};

export async function findDashboardMatchRows(
    supabase: DBClient,
    seasonIds: string[],
    fromIso: string,
    toIso: string,
): Promise<Result<DashboardMatchRow[]>> {
    if (seasonIds.length === 0) return Ok([]);
    const {data, error} = await supabase
        .from("matches")
        .select("id, season_id, match_type, status, week, match_code, scheduled_at, home_team_id, away_team_id, playoff_brackets (round)")
        .in("season_id", seasonIds)
        .or(`and(scheduled_at.gte."${fromIso}",scheduled_at.lte."${toIso}"),and(match_type.eq.playoffs,status.neq.completed,home_team_id.not.is.null,away_team_id.not.is.null)`);
    if (error) return Err(serializeError(error, "DB_ERROR"));

    return Ok(((data ?? []) as unknown as DashboardMatchQueryRow[]).map(({playoff_brackets, ...row}) => {
        const bracket = Array.isArray(playoff_brackets) ? playoff_brackets[0] : playoff_brackets;
        return {...row, playoff_round: bracket?.round ?? null};
    }));
}

const PLAYED_STATS_FILTER = [
    "ape_kills", "ape_attempts", "delay_kills", "quick_kills", "wipes_tools", "kill_attempts", "spiking_errors",
    "assists", "setting_errors", "kill_blocks", "block_touches", "serve_receives", "digs", "block_follows",
    "dives", "aces", "jump_serve_aces", "float_aces", "service_errors", "misc_errors", "receive_errors",
].map(column => `${column}.gt.0`).join(",");

const PLAYER_MATCH_SELECT = `
    id, season_id, match_code, match_type, week, scheduled_at, is_forfeit, home_sets_won, away_sets_won,
    season:seasons!season_id(season_number, slug, region:regions!region_id(code)),
    home:teams!home_team_id(id, name, logo_url, logo_bg_removed, is_bye),
    away:teams!away_team_id(id, name, logo_url, logo_bg_removed, is_bye),
    match_sets(set_number, home_score, away_score)
`;

type PlayerMatchSideRow = {id: string; name: string; logo_url: string | null; logo_bg_removed: boolean; is_bye: boolean};

type PlayerMatchRow = {
    id: string;
    season_id: string;
    match_code: string | null;
    match_type: "season" | "playoffs";
    week: number | null;
    scheduled_at: string | null;
    is_forfeit: boolean | null;
    home_sets_won: number | null;
    away_sets_won: number | null;
    season: {season_number: number; slug: string; region: {code: string}};
    home: PlayerMatchSideRow | null;
    away: PlayerMatchSideRow | null;
    match_sets: {set_number: number; home_score: number; away_score: number}[];
};

function toPlayerMatchSide(row: PlayerMatchSideRow | null): PlayerMatchSide | null {
    if (!row) return null;
    return {id: row.id, name: row.name, logoUrl: row.logo_url, logoBgRemoved: row.logo_bg_removed, isBye: row.is_bye};
}

function toPlayerMatchCandidate(row: PlayerMatchRow): PlayerMatchCandidate {
    return {
        id: row.id,
        seasonId: row.season_id,
        seasonNumber: row.season.season_number,
        seasonSlug: row.season.slug,
        regionCode: row.season.region.code,
        matchCode: row.match_code,
        matchType: row.match_type,
        week: row.week,
        scheduledAt: row.scheduled_at,
        isForfeit: row.is_forfeit ?? false,
        home: toPlayerMatchSide(row.home),
        away: toPlayerMatchSide(row.away),
        homeSetsWon: row.home_sets_won,
        awaySetsWon: row.away_sets_won,
        sets: row.match_sets.map(set => ({setNumber: set.set_number, homeScore: set.home_score, awayScore: set.away_score})),
    };
}

export async function findPlayerRosterWindows(
    supabase: DBClient,
    playerId: string
): Promise<Result<PlayerRosterWindow[]>> {
    const {data, error} = await supabase
        .from("player_team_seasons")
        .select("team_id, season_id, joined_at, left_at")
        .eq("player_id", playerId);
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok((data ?? []).map(r => ({teamId: r.team_id, seasonId: r.season_id, joinedAt: r.joined_at, leftAt: r.left_at})));
}

export async function findPlayerOwnMatchRows(
    supabase: DBClient,
    playerId: string
): Promise<Result<{matchId: string; teamId: string}[]>> {
    const {data, error} = await supabase
        .from("player_match_stats")
        .select("match_id, team_id")
        .eq("player_id", playerId)
        .or(PLAYED_STATS_FILTER);
    if (error) return Err(serializeError(error, "DB_ERROR"));
    const byMatch = new Map<string, string>();
    for (const row of data ?? []) {
        if (!byMatch.has(row.match_id)) byMatch.set(row.match_id, row.team_id);
    }
    return Ok([...byMatch].map(([matchId, teamId]) => ({matchId, teamId})));
}

export async function findCompletedMatchesForRosters(
    supabase: DBClient,
    p: {seasonIds: string[]; teamIds: string[]}
): Promise<Result<PlayerMatchCandidate[]>> {
    if (p.seasonIds.length === 0 || p.teamIds.length === 0) return Ok([]);
    const teams = p.teamIds.join(",");
    const {data, error} = await supabase
        .from("matches")
        .select(PLAYER_MATCH_SELECT)
        .eq("status", "completed")
        .in("season_id", p.seasonIds)
        .or(`home_team_id.in.(${teams}),away_team_id.in.(${teams})`);
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(((data ?? []) as unknown as PlayerMatchRow[]).map(toPlayerMatchCandidate));
}

export async function findCompletedMatchesByIds(
    supabase: DBClient,
    ids: string[]
): Promise<Result<PlayerMatchCandidate[]>> {
    if (ids.length === 0) return Ok([]);
    const {data, error} = await supabase
        .from("matches")
        .select(PLAYER_MATCH_SELECT)
        .eq("status", "completed")
        .in("id", ids);
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(((data ?? []) as unknown as PlayerMatchRow[]).map(toPlayerMatchCandidate));
}

export async function findMatchIdsWithStats(
    supabase: DBClient,
    ids: string[]
): Promise<Result<Set<string>>> {
    if (ids.length === 0) return Ok(new Set());
    const {data, error} = await supabase
        .from("player_match_stats")
        .select("match_id")
        .eq("set_number", 1)
        .in("match_id", ids)
        .or(PLAYED_STATS_FILTER);
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(new Set((data ?? []).map(row => row.match_id)));
}
