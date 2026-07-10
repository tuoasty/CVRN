import useSWR, {mutate as globalMutate, type BareFetcher} from 'swr';
import {
    getSeasonPlayoffMatchesAction,
    saveMatchSheetConfigAction,
    deleteMatchSheetConfigAction,
    previewMatchStatsAction,
    syncMatchStatsAction,
} from '@/app/actions/matchStats.actions';
import {PlayoffMatchStatRow, SaveMatchSheetConfigInput} from '@/server/domains/matchStats';
import type {PlayerOverrides} from '@/server/domains/sheets/commands/buildMatchStatsPlan';

const TTL = 2 * 60 * 1000;

async function fetchSeasonPlayoffMatches([, seasonId]: [string, string]): Promise<PlayoffMatchStatRow[]> {
    const result = await getSeasonPlayoffMatchesAction(seasonId);
    if (!result.ok) throw new Error(result.error.message);
    return result.value;
}

export function useSeasonPlayoffMatches(seasonId: string | null) {
    const key = seasonId ? ['seasonPlayoffMatches', seasonId] as const : null;
    const {data, error, isLoading, mutate} = useSWR(key, fetchSeasonPlayoffMatches as BareFetcher<PlayoffMatchStatRow[]>, {
        dedupingInterval: TTL,
        revalidateOnFocus: false,
    });
    return {matches: (data as PlayoffMatchStatRow[] | undefined) ?? [], isLoading, error: error?.message ?? null, mutate};
}

function revalidateSeasonPlayoffMatches() {
    return globalMutate((key: unknown) => Array.isArray(key) && key[0] === 'seasonPlayoffMatches', undefined, {revalidate: true});
}

export async function saveMatchSheetConfig(input: SaveMatchSheetConfigInput) {
    const result = await saveMatchSheetConfigAction(input);
    if (result.ok) await revalidateSeasonPlayoffMatches();
    return result;
}

export async function deleteMatchSheetConfig(id: string) {
    const result = await deleteMatchSheetConfigAction(id);
    if (result.ok) await revalidateSeasonPlayoffMatches();
    return result;
}

export async function previewMatchStats(configId: string, playerOverrides?: PlayerOverrides) {
    return previewMatchStatsAction(configId, playerOverrides);
}

export async function syncMatchStats(configId: string, force = false, playerOverrides?: PlayerOverrides) {
    const result = await syncMatchStatsAction(configId, force, playerOverrides);
    if (result.ok) await revalidateSeasonPlayoffMatches();
    return result;
}
