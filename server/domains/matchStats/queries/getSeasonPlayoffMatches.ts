import {DBClient} from "@/shared/types/db";
import {Ok, Result} from "@/shared/types/result";
import {findPlayoffMatchesBySeason} from "@/server/db/matches.repo";
import {findMatchSheetConfigsByMatchIds} from "@/server/db/matchSheetConfig.repo";
import {findMatchIdsWithStats} from "@/server/db/playerMatchStats.repo";
import {PlayoffMatchStatRow} from "@/server/domains/matchStats/types";

export async function getSeasonPlayoffMatches(supabase: DBClient, seasonId: string): Promise<Result<PlayoffMatchStatRow[]>> {
    const matchesResult = await findPlayoffMatchesBySeason(supabase, seasonId);
    if (!matchesResult.ok) return matchesResult;

    const matchIds = matchesResult.value.map(m => m.id);

    const configsResult = await findMatchSheetConfigsByMatchIds(supabase, matchIds);
    if (!configsResult.ok) return configsResult;
    const configByMatch = new Map(configsResult.value.map(c => [c.match_id, c]));

    const syncedResult = await findMatchIdsWithStats(supabase, [...configByMatch.keys()]);
    if (!syncedResult.ok) return syncedResult;
    const syncedSet = new Set(syncedResult.value);

    const rows: PlayoffMatchStatRow[] = matchesResult.value.map(m => {
        const cfg = configByMatch.get(m.id) ?? null;
        return {
            matchId: m.id,
            matchCode: m.match_code,
            round: m.playoff_brackets?.[0]?.round ?? null,
            status: m.status,
            homeTeamId: m.home_team_id,
            awayTeamId: m.away_team_id,
            scheduledAt: m.scheduled_at,
            configId: cfg?.id ?? null,
            sheetId: cfg?.sheet_id ?? null,
            synced: cfg ? syncedSet.has(m.id) : false,
        };
    });

    return Ok(rows);
}
