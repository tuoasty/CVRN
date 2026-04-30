import {DBClient, Match, MatchSet, Official, PlayoffBracket, PlayoffConfig, Season, Standing} from "@/shared/types/db";
import {InsertPlayoffBracketDto, InsertPlayoffMatchDto} from "@/server/domains/playoff";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";

type PlayoffBracketRoundRow = Pick<PlayoffBracket, "round">;

type PlayoffMatchOfficialJoin = {
    official_type: string;
    officials: Pick<Official, "id" | "username" | "display_name" | "avatar_url"> | null;
};

type PlayoffMatchSetJoin = Pick<MatchSet, "set_number" | "home_score" | "away_score">;

type PlayoffMatchWithDetails = Match & {
    match_sets: PlayoffMatchSetJoin[];
    match_officials: PlayoffMatchOfficialJoin[];
};

type PlayoffBracketWithMatch = {
    round: string;
    seed_home: number | null;
    seed_away: number | null;
    match_id: string;
    matches: PlayoffMatchWithDetails;
};

export async function findPlayoffConfigById(
    supabase: DBClient,
    configId: string
): Promise<Result<PlayoffConfig | null>> {
    const {data, error} = await supabase
        .from("playoff_configs")
        .select("*")
        .eq("id", configId)
        .single();
    if (error) {
        if (error.code === "PGRST116") return Ok(null);
        return Err(serializeError(error, "DB_ERROR"));
    }
    return Ok(data);
}

export async function findStandingsBySeasonId(
    supabase: DBClient,
    seasonId: string
): Promise<Result<Standing[]>> {
    const {data, error} = await supabase
        .from("standings")
        .select("*")
        .eq("season_id", seasonId)
        .order("rank", {ascending: true});
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok((data ?? []) as Standing[]);
}

export async function insertPlayoffBrackets(
    supabase: DBClient,
    brackets: InsertPlayoffBracketDto[]
): Promise<Result<PlayoffBracket[]>> {
    const rows = brackets.map(b => ({
        ...(b.id && {id: b.id}),
        season_id: b.seasonId,
        round: b.round,
        match_id: b.matchId,
        seed_home: b.seedHome,
        seed_away: b.seedAway,
        next_bracket_id: b.nextBracketId,
        winner_position: b.winnerPosition,
        loser_next_bracket_id: b.loserNextBracketId ?? null,
        loser_position: b.loserPosition ?? null,
    }));

    const {data, error} = await supabase
        .from("playoff_brackets")
        .insert(rows)
        .select();
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data ?? []);
}

export async function updateSeasonPlayoffStatus(
    supabase: DBClient,
    seasonId: string,
    data: {
        playoffStarted?: boolean;
        playoffCompleted?: boolean;
    }
): Promise<Result<Season>> {
    const updateData: {
        playoff_started?: boolean;
        playoff_completed?: boolean;
    } = {};
    if (data.playoffStarted !== undefined) {
        updateData.playoff_started = data.playoffStarted;
    }
    if (data.playoffCompleted !== undefined) {
        updateData.playoff_completed = data.playoffCompleted;
    }

    const {data: row, error} = await supabase
        .from("seasons")
        .update(updateData)
        .eq("id", seasonId)
        .select()
        .single();
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(row);
}

export async function findPlayoffBracketsBySeasonId(
    supabase: DBClient,
    seasonId: string
): Promise<Result<PlayoffBracket[]>> {
    const {data, error} = await supabase
        .from("playoff_brackets")
        .select("*")
        .eq("season_id", seasonId)
        .order("round", {ascending: true});
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data ?? []);
}

export async function findPlayoffBracketByMatchId(
    supabase: DBClient,
    matchId: string
): Promise<Result<PlayoffBracket | null>> {
    const {data, error} = await supabase
        .from("playoff_brackets")
        .select("*")
        .eq("match_id", matchId)
        .single();
    if (error) {
        if (error.code === "PGRST116") return Ok(null);
        return Err(serializeError(error, "DB_ERROR"));
    }
    return Ok(data);
}

export async function updateMatchTeam(
    supabase: DBClient,
    matchId: string,
    position: "home" | "away",
    teamId: string
): Promise<Result<Match>> {
    const updateData: {
        home_team_id?: string;
        away_team_id?: string;
    } = {};

    if (position === "home") {
        updateData.home_team_id = teamId;
    } else {
        updateData.away_team_id = teamId;
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

export async function findPlayoffConfigBySeasonId(
    supabase: DBClient,
    seasonId: string
): Promise<Result<PlayoffConfig | null>> {
    const {data: season, error: seasonError} = await supabase
        .from("seasons")
        .select("playoff_config_id")
        .eq("id", seasonId)
        .single();

    if (seasonError) return Err(serializeError(seasonError, "DB_ERROR"));
    if (!season?.playoff_config_id) return Ok(null);

    const {data, error} = await supabase
        .from("playoff_configs")
        .select("*")
        .eq("id", season.playoff_config_id)
        .single();
    if (error) {
        if (error.code === "PGRST116") return Ok(null);
        return Err(serializeError(error, "DB_ERROR"));
    }
    return Ok(data);
}

export async function insertPlayoffMatches(
    supabase: DBClient,
    matches: InsertPlayoffMatchDto[]
): Promise<Result<Match[]>> {
    const rows = matches.map(m => ({
        ...(m.id && {id: m.id}),
        season_id: m.seasonId,
        week: m.week,
        match_type: m.matchType,
        status: m.status,
        best_of: m.bestOf,
        home_team_id: m.homeTeamId ?? null,
        away_team_id: m.awayTeamId ?? null,
        home_sets_won: 0,
        away_sets_won: 0,
        home_team_lvr: 0,
        away_team_lvr: 0,
    }));

    const {data, error} = await supabase
        .from("matches")
        .insert(rows)
        .select();
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data ?? []);
}

export async function findUniquePlayoffRoundsBySeason(
    supabase: DBClient,
    seasonId: string
): Promise<Result<PlayoffBracketRoundRow[]>> {
    const {data, error} = await supabase
        .from("playoff_brackets")
        .select("round")
        .eq("season_id", seasonId)
        .order("round", {ascending: true});
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok((data ?? []) as PlayoffBracketRoundRow[]);
}

export async function findMatchesWithDetailsBySeasonAndRound(
    supabase: DBClient,
    seasonId: string,
    round: string
): Promise<Result<PlayoffBracketWithMatch[]>> {
    const {data, error} = await supabase
        .from("playoff_brackets")
        .select(`
            round,
            seed_home,
            seed_away,
            match_id,
            matches!inner (
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
            )
        `)
        .eq("season_id", seasonId)
        .eq("round", round)
        .order("seed_home", {ascending: true, nullsFirst: false});
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok((data ?? []) as unknown as PlayoffBracketWithMatch[]);
}

export async function deletePlayoffMatchesBySeasonId(
    supabase: DBClient,
    seasonId: string
): Promise<Result<true>> {
    const {error} = await supabase
        .from("matches")
        .delete()
        .eq("season_id", seasonId)
        .eq("match_type", "playoffs");
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(true);
}
