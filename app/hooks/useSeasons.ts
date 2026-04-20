import useSWR, { type BareFetcher } from 'swr';
import { getAllSeasonsAction, getSeasonBySlugAndRegionAction } from '@/app/actions/season.actions';
import { SeasonWithPlayoffConfig } from '@/server/domains/season';

const SEASONS_TTL = 30 * 60 * 1000;
const SEASON_DETAIL_TTL = 30 * 60 * 1000;

async function fetchAllSeasons(): Promise<SeasonWithPlayoffConfig[]> {
    const result = await getAllSeasonsAction();
    if (!result.ok) throw new Error(result.error.message);
    return result.value;
}

async function fetchSeasonBySlugAndRegion(
    [, slug, regionId]: [string, string, string]
): Promise<SeasonWithPlayoffConfig> {
    const result = await getSeasonBySlugAndRegionAction({ slug, regionId });
    if (!result.ok) throw new Error(result.error.message);
    return result.value;
}

export function useSeasons() {
    const { data, error, isLoading, mutate } = useSWR('seasons', fetchAllSeasons, {
        dedupingInterval: SEASONS_TTL,
        revalidateOnFocus: false,
    });

    return {
        seasons: data ?? [],
        isLoading,
        error: error?.message ?? null,
        mutate,
    };
}

export function useSeasonBySlugAndRegion(slug: string | null, regionId: string | null) {
    const key = slug && regionId ? ['season', slug, regionId] as const : null;

    const { data, error, isLoading } = useSWR(
        key,
        fetchSeasonBySlugAndRegion as BareFetcher<SeasonWithPlayoffConfig>,
        {
            dedupingInterval: SEASON_DETAIL_TTL,
            revalidateOnFocus: false,
        }
    );

    return {
        season: (data as SeasonWithPlayoffConfig | undefined) ?? null,
        isLoading,
        error: error?.message ?? null,
    };
}
