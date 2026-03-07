import { DBClient } from "@/shared/types/db";
import {InsertPlayoffBracketDto, InsertPlayoffMatchDto} from "@/server/dto/playoff.dto";

export async function findPlayoffConfigById(
    supabase: DBClient,
    configId: string
) {
    return supabase
        .from("playoff_configs")
        .select("*")
        .eq("id", configId)
        .single();
}

export async function findStandingsBySeasonId(
    supabase: DBClient,
    seasonId: string
) {
    return supabase
        .from("standings")
        .select("*")
        .eq("season_id", seasonId)
        .order("rank", { ascending: true });
}

export async function insertPlayoffBrackets(
    supabase: DBClient,
    brackets: InsertPlayoffBracketDto[]
) {
    const rows = brackets.map(b => ({
        ...(b.id && { id: b.id }),
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

    return supabase
        .from("playoff_brackets")
        .insert(rows)
        .select();
}
export async function updateSeasonPlayoffStatus(
    supabase: DBClient,
    seasonId: string,
    data: {
        playoffStarted?: boolean;
        playoffCompleted?: boolean;
    }
) {
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

    return supabase
        .from("seasons")
        .update(updateData)
        .eq("id", seasonId)
        .select()
        .single();
}

export async function findSeasonById(
    supabase: DBClient,
    seasonId: string
) {
    return supabase
        .from("seasons")
        .select("*")
        .eq("id", seasonId)
        .single();
}

export async function findPlayoffBracketsBySeasonId(
    supabase: DBClient,
    seasonId: string
) {
    return supabase
        .from("playoff_brackets")
        .select("*")
        .eq("season_id", seasonId)
        .order("round", { ascending: true });
}

export async function findPlayoffBracketByMatchId(
    supabase: DBClient,
    matchId: string
) {
    return supabase
        .from("playoff_brackets")
        .select("*")
        .eq("match_id", matchId)
        .single();
}

export async function updateMatchTeam(
    supabase: DBClient,
    matchId: string,
    position: "home" | "away",
    teamId: string
) {
    const updateData: {
        home_team_id?: string;
        away_team_id?: string;
    } = {};

    if (position === "home") {
        updateData.home_team_id = teamId;
    } else {
        updateData.away_team_id = teamId;
    }

    return supabase
        .from("matches")
        .update(updateData)
        .eq("id", matchId)
        .select()
        .single();
}

export async function findPlayoffConfigBySeasonId(
    supabase: DBClient,
    seasonId: string
) {
    const { data: season, error } = await supabase
        .from("seasons")
        .select("playoff_config_id")
        .eq("id", seasonId)
        .single();

    if (error || !season?.playoff_config_id) {
        return { data: null, error };
    }

    return supabase
        .from("playoff_configs")
        .select("*")
        .eq("id", season.playoff_config_id)
        .single();
}

export async function insertPlayoffMatches(
    supabase: DBClient,
    matches: InsertPlayoffMatchDto[]
) {
    const rows = matches.map(m => ({
        ...(m.id && { id: m.id }),
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

    return supabase
        .from("matches")
        .insert(rows)
        .select();
}

export async function findUniquePlayoffRoundsBySeason(
    supabase: DBClient,
    seasonId: string
) {
    return supabase
        .from("playoff_brackets")
        .select("round")
        .eq("season_id", seasonId)
        .order("round", { ascending: true });
}

export async function findMatchesWithDetailsBySeasonAndRound(
    supabase: DBClient,
    seasonId: string,
    round: string
) {
    return supabase
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
        .order("seed_home", { ascending: true, nullsFirst: false });
}