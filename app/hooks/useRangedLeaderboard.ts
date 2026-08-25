import useSWR, {type BareFetcher} from "swr";
import {getRangedSeasonLeaderboardAction} from "@/app/actions/leaderboard.actions";
import type {PlayerLeaderboardRow} from "@/server/domains/player";

async function fetcher(
    [, seasonId, regionId, from, to]: [string, string, string, string, string]
): Promise<PlayerLeaderboardRow[]> {
    const result = await getRangedSeasonLeaderboardAction({seasonId, regionId, from, to});
    if (!result.ok) throw new Error(result.error.message);
    return result.value;
}

export function useRangedLeaderboard(
    seasonId: string,
    regionId: string,
    range: {from: string | null; to: string | null}
) {
    const active = Boolean(range.from && range.to);
    const key = active
        ? (["rangedLeaderboard", seasonId, regionId, range.from, range.to] as const)
        : null;

    const {data, error, isLoading} = useSWR(key, fetcher as BareFetcher<PlayerLeaderboardRow[]>, {
        revalidateOnFocus: false,
        keepPreviousData: true,
    });

    return {
        rows: data as PlayerLeaderboardRow[] | undefined,
        isLoading: active && isLoading,
        error: error?.message ?? null,
        active,
    };
}
