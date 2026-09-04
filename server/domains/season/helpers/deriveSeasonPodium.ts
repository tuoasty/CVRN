import {DBClient} from "@/shared/types/db";
import {logger} from "@/server/utils/logger";

export async function deriveSeasonPodiumFromPlayoffs(
    supabase: DBClient,
    seasonId: string
): Promise<{place: number; teamId: string}[]> {
    const {data: finalBracket} = await supabase
        .from("playoff_brackets")
        .select("match_id")
        .eq("season_id", seasonId)
        .eq("round", "final")
        .maybeSingle();

    if (!finalBracket?.match_id) return deriveDoubleElimPodium(supabase, seasonId);

    const {data: finalMatch} = await supabase
        .from("matches")
        .select("home_team_id, away_team_id, home_sets_won, away_sets_won")
        .eq("id", finalBracket.match_id)
        .maybeSingle();

    if (!finalMatch?.home_team_id || !finalMatch?.away_team_id) return [];
    if (finalMatch.home_sets_won == null || finalMatch.away_sets_won == null) return [];

    const homeWins = finalMatch.home_sets_won > finalMatch.away_sets_won;
    const podium: {place: number; teamId: string}[] = [
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
            }, {
                place: 4,
                teamId: thirdHomeWins ? thirdMatch.away_team_id : thirdMatch.home_team_id,
            });
        }
    } 
    //deleted the semifinals exception, doesn't exist afaik, also inherently wrong

    const {data: quarters} = await supabase
        .from("playoff_brackets")
        .select("match_id")
        .eq("season_id", seasonId)
        .eq("round", "quarterfinal");

    for (const qf of quarters ?? []) {
        if(!qf.match_id) continue;
        const {data: qfMatch} = await supabase
            .from("matches")
            .select("home_team_id, away_team_id, home_sets_won, away_sets_won")
            .eq("id", qf.match_id)
            .maybeSingle()
        
        if(!qfMatch?.home_team_id || !qfMatch.away_team_id) continue;
        if (qfMatch.home_sets_won == null || qfMatch.away_sets_won == null) continue;

        const qfHomeWins = qfMatch.home_sets_won > qfMatch.away_sets_won;
        podium.push({place: 5, teamId: qfHomeWins ? qfMatch.away_team_id : qfMatch.home_team_id})
    }

    return podium;
}

async function deriveDoubleElimPodium(
    supabase: DBClient,
    seasonId: string
): Promise<{place: number; teamId: string}[]> {
    const {data: gfBracket} = await supabase
        .from("playoff_brackets")
        .select("match_id")
        .eq("season_id", seasonId)
        .eq("round", "grand_final")
        .maybeSingle();

    if (!gfBracket?.match_id) return [];

    const {data: gfMatch} = await supabase
        .from("matches")
        .select("home_team_id, away_team_id, home_sets_won, away_sets_won")
        .eq("id", gfBracket.match_id)
        .maybeSingle();

    if (!gfMatch?.home_team_id || !gfMatch?.away_team_id) return [];
    if (gfMatch.home_sets_won == null || gfMatch.away_sets_won == null) return [];

    const gfHomeWins = gfMatch.home_sets_won > gfMatch.away_sets_won;

    let podium: {place: number; teamId: string}[];

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

        if (!brMatch?.home_team_id || !brMatch?.away_team_id) return [];
        if (brMatch.home_sets_won == null || brMatch.away_sets_won == null) return [];

        const brHomeWins = brMatch.home_sets_won > brMatch.away_sets_won;
        podium = [
            {place: 1, teamId: brHomeWins ? brMatch.home_team_id : brMatch.away_team_id},
            {place: 2, teamId: brHomeWins ? brMatch.away_team_id : brMatch.home_team_id},
        ];
    }

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

    
    const {data: lsfBracket} = await supabase
        .from("playoff_brackets")
        .select("match_id")
        .eq("season_id", seasonId)
        .eq("round", "losers_semifinal")
        .maybeSingle();

    if (lsfBracket?.match_id) {
        const {data: lsfMatch} = await supabase
            .from("matches")
            .select("home_team_id, away_team_id, home_sets_won, away_sets_won")
            .eq("id", lsfBracket.match_id)
            .maybeSingle();

        if (lsfMatch?.home_team_id && lsfMatch?.away_team_id &&
            lsfMatch.home_sets_won != null && lsfMatch.away_sets_won != null) {
            const lsfHomeWins = lsfMatch.home_sets_won > lsfMatch.away_sets_won;
            podium.push({
                place: 4,
                teamId: lsfHomeWins ? lsfMatch.away_team_id : lsfMatch.home_team_id,
            });
        } else {
            logger.warn({seasonId}, "Could not determine 4th place from losers semifinal");
        }
    }

    const {data: lqfs} = await supabase
        .from("playoff_brackets")
        .select("match_id")
        .eq("season_id", seasonId)
        .eq("round", "losers_quarterfinal");

    for (const qf of lqfs ?? []) {
        if(!qf.match_id) continue;
        const {data: qfMatch} = await supabase
            .from("matches")
            .select("home_team_id, away_team_id, home_sets_won, away_sets_won")
            .eq("id", qf.match_id)
            .maybeSingle()
        
        if(!qfMatch?.home_team_id || !qfMatch.away_team_id) continue;
        if (qfMatch.home_sets_won == null || qfMatch.away_sets_won == null) continue;

        const qfHomeWins = qfMatch.home_sets_won > qfMatch.away_sets_won;
        podium.push({place: 5, teamId: qfHomeWins ? qfMatch.away_team_id : qfMatch.home_team_id})
    }

    return podium;
}
