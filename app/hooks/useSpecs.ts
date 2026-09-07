import useSWR, {mutate as globalMutate, type BareFetcher} from 'swr';
import {
    getSpecsAction,
    saveSpecAction,
    deleteSpecAction,
    getSpecLeaderboardAction,
    getPlacementBonusAction,
    savePlacementBonusAction,
    resetPlacementBonusAction,
} from '@/app/actions/spec.actions';
import {PlacementBonusConfig, SaveSpecInput, SpecWithRequirements} from '@/server/domains/spec/types';
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
    placeByTeamId: Record<string, number>;
    upperFinalistTeamId: string | null;
};

async function fetchSpecLeaderboard([, seasonId]: [string, string]): Promise<SpecLeaderboardData> {
    const result = await getSpecLeaderboardAction(seasonId);
    if (!result.ok) throw new Error(result.error.message);
    return result.value;
}

type SpecBonusData = {config: PlacementBonusConfig; isCustom: boolean};

async function fetchSpecBonus([, regionId]: [string, string]): Promise<SpecBonusData> {
    const result = await getPlacementBonusAction(regionId);
    if (!result.ok) throw new Error(result.error.message);
    return result.value;
}

export function useSpecBonus(regionId: string | null) {
    const key = regionId ? (['specBonus', regionId] as const) : null;
    const {data, error, isLoading, mutate} = useSWR(
        key,
        fetchSpecBonus as BareFetcher<SpecBonusData>,
        {dedupingInterval: TTL, revalidateOnFocus: false}
    );
    const value = data as SpecBonusData | undefined;

    const save = async (config: PlacementBonusConfig) => {
        if (!regionId) return {ok: false as const, error: {message: 'No region selected', code: 'VALIDATION_ERROR' as const}};
        const result = await savePlacementBonusAction({regionId, config});
        if (result.ok) await mutate({config: result.value, isCustom: true}, {revalidate: false});
        return result;
    };

    const reset = async () => {
        if (!regionId) return {ok: false as const, error: {message: 'No region selected', code: 'VALIDATION_ERROR' as const}};
        const result = await resetPlacementBonusAction(regionId);
        if (result.ok) await mutate(undefined, {revalidate: true});
        return result;
    };

    return {
        config: value?.config ?? null,
        isCustom: value?.isCustom ?? false,
        isLoading,
        error: error?.message ?? null,
        save,
        reset,
    };
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
        placeByTeamId: value?.placeByTeamId ?? {},
        upperFinalistTeamId: value?.upperFinalistTeamId ?? null,
        isLoading,
        error: error?.message ?? null,
    };
}
