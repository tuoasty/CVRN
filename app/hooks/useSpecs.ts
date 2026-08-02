import useSWR, {mutate as globalMutate, type BareFetcher} from 'swr';
import {
    getSpecsAction,
    saveSpecAction,
    deleteSpecAction,
    getSpecLeaderboardAction,
} from '@/app/actions/spec.actions';
import {SaveSpecInput, SpecWithRequirements} from '@/server/domains/spec/types';
import {PlayerLeaderboardRow} from '@/server/domains/player';

const TTL = 2 * 60 * 1000;

async function fetchSpecs(): Promise<SpecWithRequirements[]> {
    const result = await getSpecsAction();
    if (!result.ok) throw new Error(result.error.message);
    return result.value;
}

export function useSpecs() {
    const {data, error, isLoading, mutate} = useSWR(
        ['specs'] as const,
        fetchSpecs as BareFetcher<SpecWithRequirements[]>,
        {dedupingInterval: TTL, revalidateOnFocus: false}
    );
    return {
        specs: (data as SpecWithRequirements[] | undefined) ?? [],
        isLoading,
        error: error?.message ?? null,
        mutate,
    };
}

export function revalidateSpecs() {
    return globalMutate((key: unknown) => Array.isArray(key) && key[0] === 'specs', undefined, {revalidate: true});
}

export async function saveSpec(input: SaveSpecInput) {
    const result = await saveSpecAction(input);
    if (result.ok) await revalidateSpecs();
    return result;
}

export async function deleteSpec(id: string) {
    const result = await deleteSpecAction(id);
    if (result.ok) await revalidateSpecs();
    return result;
}

type SpecLeaderboardData = {
    players: PlayerLeaderboardRow[];
    placements: Record<string, number>;
};

async function fetchSpecLeaderboard([, seasonId]: [string, string]): Promise<SpecLeaderboardData> {
    const result = await getSpecLeaderboardAction(seasonId);
    if (!result.ok) throw new Error(result.error.message);
    return result.value;
}

export function useSpecLeaderboard(seasonId: string | null) {
    const key = seasonId ? (['specLeaderboard', seasonId] as const) : null;
    const {data, error, isLoading} = useSWR(
        key,
        fetchSpecLeaderboard as BareFetcher<SpecLeaderboardData>,
        {dedupingInterval: TTL, revalidateOnFocus: false}
    );
    const value = data as SpecLeaderboardData | undefined;
    return {
        rows: value?.players ?? [],
        placements: value?.placements ?? {},
        isLoading,
        error: error?.message ?? null,
    };
}
