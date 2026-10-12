import useSWR, {mutate as globalMutate, type BareFetcher} from 'swr';
import {
    getSpecsAction,
    getSpecsAllRegionsAction,
    saveSpecIdentityAction,
    setSpecVaultedAction,
    saveRegionRequirementsAction,
    exportSpecRequirementsAction,
    importSpecRequirementsAction,
    deleteSpecAction,
    getSpecLeaderboardAction,
    getPlacementBonusAction,
    savePlacementBonusAction,
    resetPlacementBonusAction,
} from '@/app/actions/spec.actions';
import {
    PlacementBonusConfig,
    SaveRegionRequirementsInput,
    SaveSpecIdentityInput,
    SpecImportMode,
    SpecWithAllRegions,
    SpecWithRequirements,
} from '@/server/domains/spec/types';
import {PlayerLeaderboardRow} from '@/server/domains/player';

const TTL = 2 * 60 * 1000;

async function fetchSpecs([, regionId]: [string, string]): Promise<SpecWithRequirements[]> {
    const result = await getSpecsAction(regionId);
    if (!result.ok) throw new Error(result.error.message);
    return result.value;
}

export function useSpecs(regionId: string | null) {
    const key = regionId ? (['specs', regionId] as const) : null;
    const {data, error, isLoading, mutate} = useSWR(
        key,
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

async function fetchSpecsAllRegions(): Promise<SpecWithAllRegions[]> {
    const result = await getSpecsAllRegionsAction();
    if (!result.ok) throw new Error(result.error.message);
    return result.value;
}

export function useSpecsAllRegions() {
    const {data, error, isLoading, mutate} = useSWR(
        ['specs', '__all__'] as const,
        fetchSpecsAllRegions as BareFetcher<SpecWithAllRegions[]>,
        {dedupingInterval: TTL, revalidateOnFocus: false}
    );
    return {
        specs: (data as SpecWithAllRegions[] | undefined) ?? [],
        isLoading,
        error: error?.message ?? null,
        mutate,
    };
}

const isSpecsKey = (key: unknown) => Array.isArray(key) && key[0] === 'specs';

export function revalidateSpecs() {
    return globalMutate(isSpecsKey);
}

export async function saveSpecIdentity(input: SaveSpecIdentityInput) {
    const result = await saveSpecIdentityAction(input);
    if (result.ok) await revalidateSpecs();
    return result;
}

export async function setSpecVaulted(id: string, isVaulted: boolean) {
    await globalMutate(
        isSpecsKey,
        (data: {id: string}[] | undefined) => data?.map(s => (s.id === id ? {...s, is_vaulted: isVaulted} : s)),
        {revalidate: false}
    );
    const result = await setSpecVaultedAction({id, isVaulted});
    await revalidateSpecs();
    return result;
}

export async function saveRegionRequirements(input: SaveRegionRequirementsInput) {
    const result = await saveRegionRequirementsAction(input);
    if (result.ok) await revalidateSpecs();
    return result;
}

export async function exportSpecRequirements(regionId: string) {
    return exportSpecRequirementsAction({regionId});
}

export async function importSpecRequirements(
    regionId: string,
    file: unknown,
    mode: SpecImportMode,
    dryRun: boolean
) {
    const result = await importSpecRequirementsAction({regionId, file, mode, dryRun});
    if (result.ok && result.value.status === 'applied') await revalidateSpecs();
    return result;
}

export async function deleteSpec(id: string) {
    const result = await deleteSpecAction(id);
    if (result.ok) await revalidateSpecs();
    return result;
}

type SpecLeaderboardData = {
    matchedPlayers: PlayerLeaderboardRow[];
    fallbackPlayers: PlayerLeaderboardRow[];
    placeByTeamId: Record<string, number>;
    upperFinalistTeamId: string | null;
};

async function fetchSpecLeaderboard(
    [, seasonId, position]: [string, string, string]
): Promise<SpecLeaderboardData> {
    const result = await getSpecLeaderboardAction(seasonId, position || null);
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
        if (result.ok) await mutate();
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

export function useSpecLeaderboard(seasonId: string | null, position: string | null) {
    const key = seasonId ? (['specLeaderboard', seasonId, position ?? ''] as const) : null;
    const {data, error, isLoading} = useSWR(
        key,
        fetchSpecLeaderboard as BareFetcher<SpecLeaderboardData>,
        {revalidateOnFocus: true}
    );
    const value = data as SpecLeaderboardData | undefined;
    return {
        matchedRows: value?.matchedPlayers ?? [],
        fallbackRows: value?.fallbackPlayers ?? [],
        placeByTeamId: value?.placeByTeamId ?? {},
        upperFinalistTeamId: value?.upperFinalistTeamId ?? null,
        isLoading,
        error: error?.message ?? null,
    };
}
