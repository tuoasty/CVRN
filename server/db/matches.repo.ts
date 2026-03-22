import {DBClient} from "@/shared/types/db";
import {InsertMatchDto} from "@/server/dto/match.dto";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";

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
        matchMvpPlayerId: string | null;
        loserMvpPlayerId: string | null;
        isForfeit: boolean;
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
        is_forfeit: data.isForfeit,
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
            home_team_lvr: null,
            away_team_lvr: null,
            match_mvp_player_id: null,
            loser_mvp_player_id: null,
            is_forfeit: false
        })
        .eq("id", matchId)
        .select()
        .single();
}
export async function updateMatchResults(
    supabase: DBClient,
    matchId: string,
    data: {
        homeSetsWon: number;
        awaySetsWon: number;
        homeTeamLvr: number | null;
        awayTeamLvr: number | null;
        matchMvpPlayerId: string | null;
        loserMvpPlayerId: string | null;
        isForfeit: boolean;
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
            is_forfeit: data.isForfeit,
        })
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


export async function resetDownstreamBrackets(
    supabase: DBClient,
    bracketId: string
): Promise<Result<void>> {
    try {
        const { data: bracket, error: bracketError } = await supabase
            .from("playoff_brackets")
            .select("next_bracket_id, loser_next_bracket_id, match_id, winner_position, loser_position")
            .eq("id", bracketId)
            .single();

        if (bracketError) {
            return Err(serializeError(bracketError));
        }

        if (!bracket) {
            return Ok(undefined);
        }

        // Reset winner path
        if (bracket.next_bracket_id && bracket.winner_position) {
            const { data: nextBracket } = await supabase
                .from("playoff_brackets")
                .select("match_id, id")
                .eq("id", bracket.next_bracket_id)
                .single();

            if (nextBracket) {
                const teamField = bracket.winner_position === "home" ? "home_team_id" : "away_team_id";
                const seedField = bracket.winner_position === "home" ? "seed_home" : "seed_away";

                const { data: nextMatch } = await findMatchById(supabase, nextBracket.match_id);

                if (nextMatch?.status === "completed") {
                    // Get the OTHER team field to check if we need full reset
                    const otherTeamField = bracket.winner_position === "home" ? "away_team_id" : "home_team_id";
                    const otherTeamId = nextMatch[otherTeamField];

                    // If the other side also has a team, we can't just reset one side
                    // We need to check if the other side came from a completed match
                    if (otherTeamId) {
                        // Full match reset needed - both teams involved
                        await resetDownstreamBrackets(supabase, nextBracket.id);

                        await supabase
                            .from("match_sets")
                            .delete()
                            .eq("match_id", nextBracket.match_id);

                        await supabase
                            .from("matches")
                            .update({
                                status: "pending",
                                home_sets_won: null,
                                away_sets_won: null,
                                home_team_lvr: null,
                                away_team_lvr: null,
                                match_mvp_player_id: null,
                                loser_mvp_player_id: null,
                                is_forfeit: false,
                                home_team_id: null,
                                away_team_id: null
                            })
                            .eq("id", nextBracket.match_id);

                        await supabase
                            .from("playoff_brackets")
                            .update({
                                seed_home: null,
                                seed_away: null
                            })
                            .eq("id", bracket.next_bracket_id);
                    } else {
                        // Only one side was filled (this match's winner), safe to just clear that side
                        await supabase
                            .from("match_sets")
                            .delete()
                            .eq("match_id", nextBracket.match_id);

                        await supabase
                            .from("matches")
                            .update({
                                status: "pending",
                                home_sets_won: null,
                                away_sets_won: null,
                                home_team_lvr: null,
                                away_team_lvr: null,
                                match_mvp_player_id: null,
                                loser_mvp_player_id: null,
                                is_forfeit: false,
                                [teamField]: null
                            })
                            .eq("id", nextBracket.match_id);

                        await supabase
                            .from("playoff_brackets")
                            .update({ [seedField]: null })
                            .eq("id", bracket.next_bracket_id);
                    }
                } else if (nextMatch?.status === "scheduled" || nextMatch?.status === "pending") {
                    // Only clear the specific team slot
                    await supabase
                        .from("matches")
                        .update({ [teamField]: null })
                        .eq("id", nextBracket.match_id);

                    await supabase
                        .from("playoff_brackets")
                        .update({ [seedField]: null })
                        .eq("id", bracket.next_bracket_id);
                }
            }
        }

        // Reset loser path (third place) - same logic
        if (bracket.loser_next_bracket_id && bracket.loser_position) {
            const { data: loserBracket } = await supabase
                .from("playoff_brackets")
                .select("match_id, id")
                .eq("id", bracket.loser_next_bracket_id)
                .single();

            if (loserBracket) {
                const teamField = bracket.loser_position === "home" ? "home_team_id" : "away_team_id";
                const seedField = bracket.loser_position === "home" ? "seed_home" : "seed_away";

                const { data: loserMatch } = await findMatchById(supabase, loserBracket.match_id);

                if (loserMatch?.status === "completed") {
                    const otherTeamField = bracket.loser_position === "home" ? "away_team_id" : "home_team_id";
                    const otherTeamId = loserMatch[otherTeamField];

                    if (otherTeamId) {
                        await resetDownstreamBrackets(supabase, loserBracket.id);

                        await supabase
                            .from("match_sets")
                            .delete()
                            .eq("match_id", loserBracket.match_id);

                        await supabase
                            .from("matches")
                            .update({
                                status: "pending",
                                home_sets_won: null,
                                away_sets_won: null,
                                home_team_lvr: null,
                                away_team_lvr: null,
                                match_mvp_player_id: null,
                                loser_mvp_player_id: null,
                                is_forfeit: false,
                                home_team_id: null,
                                away_team_id: null
                            })
                            .eq("id", loserBracket.match_id);

                        await supabase
                            .from("playoff_brackets")
                            .update({
                                seed_home: null,
                                seed_away: null
                            })
                            .eq("id", bracket.loser_next_bracket_id);
                    } else {
                        await supabase
                            .from("match_sets")
                            .delete()
                            .eq("match_id", loserBracket.match_id);

                        await supabase
                            .from("matches")
                            .update({
                                status: "pending",
                                home_sets_won: null,
                                away_sets_won: null,
                                home_team_lvr: null,
                                away_team_lvr: null,
                                match_mvp_player_id: null,
                                loser_mvp_player_id: null,
                                is_forfeit: false,
                                [teamField]: null
                            })
                            .eq("id", loserBracket.match_id);

                        await supabase
                            .from("playoff_brackets")
                            .update({ [seedField]: null })
                            .eq("id", bracket.loser_next_bracket_id);
                    }
                } else if (loserMatch?.status === "scheduled" || loserMatch?.status === "pending") {
                    await supabase
                        .from("matches")
                        .update({ [teamField]: null })
                        .eq("id", loserBracket.match_id);

                    await supabase
                        .from("playoff_brackets")
                        .update({ [seedField]: null })
                        .eq("id", bracket.loser_next_bracket_id);
                }
            }
        }

        return Ok(undefined);
    } catch (error) {
        logger.error({ bracketId, error }, "Failed to reset downstream brackets");
        return Err(serializeError(error));
    }
}