import {DBClient} from "@/shared/types/db";
import {logger} from "@/server/utils/logger";

export async function deriveSeasonPodiumFromPlayoffs(
    supabase: DBClient,
    seasonId: string
): Promise<{place: 1 | 2 | 3; teamId: string}[]> {
    const {data: finalBracket} = await supabase
        .from("playoff_brackets")
        .select("match_id")
        .eq("season_id", seasonId)
        .eq("round", "final")
        .maybeSingle();

    // No single-elim `final` round -> this is a double-elim season (grand_final +
    // bracket_reset). Derive the podium from that shape instead.
    if (!finalBracket?.match_id) return deriveDoubleElimPodium(supabase, seasonId);

    const {data: finalMatch} = await supabase
        .from("matches")
        .select("home_team_id, away_team_id, home_sets_won, away_sets_won")
        .eq("id", finalBracket.match_id)
        .maybeSingle();

    if (!finalMatch?.home_team_id || !finalMatch?.away_team_id) return [];
    if (finalMatch.home_sets_won == null || finalMatch.away_sets_won == null) return [];

    const homeWins = finalMatch.home_sets_won > finalMatch.away_sets_won;
    const podium: {place: 1 | 2 | 3; teamId: string}[] = [
        {place: 1, teamId: homeWins ? finalMatch.home_team_id : finalMatch.away_team_id},
        {place: 2, teamId: homeWins ? finalMatch.away_team_id : finalMatch.home_team_id},
    ];

    const {data: thirdBracket} = await supabase
        .from("playoff_brackets")
        .select("match_id")
        .eq("season_id", seasonId)
        .eq("round", "third_place")
        .maybeSingle();

    if (thirdBracket?.match_id) {
        const {data: thirdMatch} = await supabase
            .from("matches")
            .select("home_team_id, away_team_id, home_sets_won, away_sets_won")
            .eq("id", thirdBracket.match_id)
            .maybeSingle();

        if (thirdMatch?.home_team_id && thirdMatch?.away_team_id &&
            thirdMatch.home_sets_won != null && thirdMatch.away_sets_won != null) {
            const thirdHomeWins = thirdMatch.home_sets_won > thirdMatch.away_sets_won;
            podium.push({
                place: 3,
                teamId: thirdHomeWins ? thirdMatch.home_team_id : thirdMatch.away_team_id,
            });
        }
    } else {
        const {data: semis} = await supabase
            .from("playoff_brackets")
            .select("match_id")
            .eq("season_id", seasonId)
            .eq("round", "semifinal");

        for (const sf of semis ?? []) {
            if (!sf.match_id) continue;
            const {data: sfMatch} = await supabase
                .from("matches")
                .select("home_team_id, away_team_id, home_sets_won, away_sets_won")
                .eq("id", sf.match_id)
                .maybeSingle();

            if (!sfMatch?.home_team_id || !sfMatch?.away_team_id) continue;
            if (sfMatch.home_sets_won == null || sfMatch.away_sets_won == null) continue;

            const sfHomeWins = sfMatch.home_sets_won > sfMatch.away_sets_won;
            const loser = sfHomeWins ? sfMatch.away_team_id : sfMatch.home_team_id;

            if (!podium.some(p => p.teamId === loser)) {
                podium.push({place: 3, teamId: loser});
                break;
            }
        }

        if (!podium.find(p => p.place === 3)) {
            logger.warn({seasonId}, "Could not determine 3rd place from semifinal losers");
        }
    }

    return podium;
}

// Double-elim podium. Champion is decided by the grand final unless the
// lower-bracket finalist wins it and forces the bracket reset (BR), in which case
// BR is the true final. 3rd place is the loser of the losers final (LF).
async function deriveDoubleElimPodium(
    supabase: DBClient,
    seasonId: string
): Promise<{place: 1 | 2 | 3; teamId: string}[]> {
    const {data: gfBracket} = await supabase
        .from("playoff_brackets")
        .select("match_id")
        .eq("season_id", seasonId)
        .eq("round", "grand_final")
        .maybeSingle();

    // Neither single- nor double-elim final present -> nothing to derive.
    if (!gfBracket?.match_id) return [];

    const {data: gfMatch} = await supabase
        .from("matches")
        .select("home_team_id, away_team_id, home_sets_won, away_sets_won")
        .eq("id", gfBracket.match_id)
        .maybeSingle();

    if (!gfMatch?.home_team_id || !gfMatch?.away_team_id) return [];
    if (gfMatch.home_sets_won == null || gfMatch.away_sets_won == null) return [];

    // GF home = upper-bracket finalist, away = lower-bracket finalist. If home wins
    // the tournament is over (BR skipped); if away wins, BR is played and decides it.
    const gfHomeWins = gfMatch.home_sets_won > gfMatch.away_sets_won;

    let podium: {place: 1 | 2 | 3; teamId: string}[];

    if (gfHomeWins) {
        podium = [
            {place: 1, teamId: gfMatch.home_team_id},
            {place: 2, teamId: gfMatch.away_team_id},
        ];
    } else {
        const {data: brBracket} = await supabase
            .from("playoff_brackets")
            .select("match_id")
            .eq("season_id", seasonId)
            .eq("round", "bracket_reset")
            .maybeSingle();

        if (!brBracket?.match_id) return [];

        const {data: brMatch} = await supabase
            .from("matches")
            .select("home_team_id, away_team_id, home_sets_won, away_sets_won")
            .eq("id", brBracket.match_id)
            .maybeSingle();

        // BR forced but not yet resolved -> podium still pending.
        if (!brMatch?.home_team_id || !brMatch?.away_team_id) return [];
        if (brMatch.home_sets_won == null || brMatch.away_sets_won == null) return [];

        const brHomeWins = brMatch.home_sets_won > brMatch.away_sets_won;
        podium = [
            {place: 1, teamId: brHomeWins ? brMatch.home_team_id : brMatch.away_team_id},
            {place: 2, teamId: brHomeWins ? brMatch.away_team_id : brMatch.home_team_id},
        ];
    }

    // 3rd place = loser of the losers final (already beat everyone else in the LB).
    // Distinct from the GF/BR teams by construction, so no dedup needed.
    const {data: lfBracket} = await supabase
        .from("playoff_brackets")
        .select("match_id")
        .eq("season_id", seasonId)
        .eq("round", "losers_final")
        .maybeSingle();

    if (lfBracket?.match_id) {
        const {data: lfMatch} = await supabase
            .from("matches")
            .select("home_team_id, away_team_id, home_sets_won, away_sets_won")
            .eq("id", lfBracket.match_id)
            .maybeSingle();

        if (lfMatch?.home_team_id && lfMatch?.away_team_id &&
            lfMatch.home_sets_won != null && lfMatch.away_sets_won != null) {
            const lfHomeWins = lfMatch.home_sets_won > lfMatch.away_sets_won;
            podium.push({
                place: 3,
                teamId: lfHomeWins ? lfMatch.away_team_id : lfMatch.home_team_id,
            });
        } else {
            logger.warn({seasonId}, "Could not determine 3rd place from losers final");
        }
    }

    return podium;
}
