import useSWR, { type BareFetcher } from 'swr';
import { StandingWithInfo } from '@/server/dto/standing.dto';
import { getStandingsAction } from '@/app/actions/standing.actions';

const STANDINGS_TTL = 2 * 60 * 1000;

async function fetchStandings(
    [, seasonId, regionId]: [string, string | undefined, string | undefined]
): Promise<StandingWithInfo[]> {
    const result = await getStandingsAction({ seasonId, regionId });
    if (!result.ok) throw new Error(result.error.message);
    return result.value;
}

export function useStandings(seasonId?: string, regionId?: string) {
    const key = seasonId || regionId
        ? ['standings', seasonId, regionId] as const
        : null;

    const { data, error, isLoading, mutate } = useSWR(
        key,
        fetchStandings as BareFetcher<StandingWithInfo[]>,
        {
            dedupingInterval: STANDINGS_TTL,
            revalidateOnFocus: false,
        }
    );

    return {
        standings: (data as StandingWithInfo[] | undefined) ?? [],
        isLoading,
        error: error?.message ?? null,
        mutate,
    };
}
