import {DBClient} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {
    findCompletedMatchesByIds,
    findCompletedMatchesForRosters,
    findMatchIdsWithStats,
    findPlayerOwnMatchRows,
    findPlayerRosterWindows,
} from "@/server/db/matches.repo";
import {PlayerRecentMatch} from "../types";
import {compareMatchesNewestFirst, selectPlayerMatches} from "../helpers/selectPlayerMatches";

const CANDIDATE_CAP = 40;
const RECENT_MATCH_LIMIT = 6;

export async function getPlayerRecentMatches(
    supabase: DBClient,
    p: {playerId: string}
): Promise<Result<PlayerRecentMatch[]>> {
    try {
        const [rosters, ownMatches] = await Promise.all([
            findPlayerRosterWindows(supabase, p.playerId),
            findPlayerOwnMatchRows(supabase, p.playerId),
        ]);
        if (!rosters.ok) return rosters;
        if (!ownMatches.ok) return ownMatches;
        if (rosters.value.length === 0 && ownMatches.value.length === 0) return Ok([]);

        const rosterMatches = await findCompletedMatchesForRosters(supabase, {
            seasonIds: [...new Set(rosters.value.map(r => r.seasonId))],
            teamIds: [...new Set(rosters.value.map(r => r.teamId))],
        });
        if (!rosterMatches.ok) return rosterMatches;

        const known = new Set(rosterMatches.value.map(m => m.id));
        const extraMatches = await findCompletedMatchesByIds(
            supabase,
            ownMatches.value.map(own => own.matchId).filter(id => !known.has(id)),
        );
        if (!extraMatches.ok) return extraMatches;

        const candidates = [...rosterMatches.value, ...extraMatches.value]
            .sort(compareMatchesNewestFirst)
            .slice(0, CANDIDATE_CAP);

        const withStats = await findMatchIdsWithStats(supabase, candidates.map(m => m.id));
        if (!withStats.ok) return withStats;

        return Ok(selectPlayerMatches({
            candidates,
            rosters: rosters.value,
            ownMatches: ownMatches.value,
            matchIdsWithStats: withStats.value,
            limit: RECENT_MATCH_LIMIT,
        }));
    } catch (error) {
        logger.error({error, playerId: p.playerId}, "Unexpected error in getPlayerRecentMatches");
        return Err(serializeError(error));
    }
}
