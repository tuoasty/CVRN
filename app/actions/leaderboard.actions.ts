"use server"

import {createPublicClient} from "@/server/supabase/server-public";
import {getRangedLeaderboardStatRows, getRangedPositionCounts, RangedLeaderboardSchema} from "@/server/domains/player";
import type {LeaderboardStatRow, PlayerLeaderboardRow, PositionCounts} from "@/server/domains/player";
import {getCachedPlayerLeaderboard, getCachedLeaderboardIdentity} from "@/server/cache/publicReads";
import {joinLeaderboardIdentity} from "@/app/features/leaderboard/joinLeaderboardIdentity";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";

export async function getRangedSeasonLeaderboardAction(input: unknown): Promise<Result<PlayerLeaderboardRow[]>> {
    const parsed = RangedLeaderboardSchema.safeParse(input);
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});
    const {seasonId, regionId, from, to} = parsed.data;

    try {
        const client = createPublicClient();
        const [rangedRes, posCountsRes, fullSeasonRows, identity] = await Promise.all([
            getRangedLeaderboardStatRows(client, {seasonId, from, to}),
            getRangedPositionCounts(client, {seasonId, from, to}),
            getCachedPlayerLeaderboard(seasonId),
            getCachedLeaderboardIdentity(),
        ]);
        if (!rangedRes.ok) return rangedRes;

        const teamByPlayer = new Map(fullSeasonRows.map(r => [r.player_id, r.team_id]));
        const posByPlayer = new Map<string, PositionCounts | null>(
            posCountsRes.ok ? posCountsRes.value.map(r => [r.player_id, r.position_counts]) : []
        );

        const statRows: LeaderboardStatRow[] = rangedRes.value.flatMap(r => {
            if (!r.player_id || !r.season_id) return [];
            return [{
                ...r,
                player_id: r.player_id,
                season_id: r.season_id,
                region_id: regionId,
                team_id: teamByPlayer.get(r.player_id) ?? null,
                position_counts: posByPlayer.get(r.player_id) ?? null,
            } as LeaderboardStatRow];
        });

        return Ok(joinLeaderboardIdentity(statRows, identity));
    } catch (error) {
        return Err(serializeError(error));
    }
}
