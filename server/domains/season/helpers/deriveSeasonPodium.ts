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

    if (!finalBracket?.match_id) return [];

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
