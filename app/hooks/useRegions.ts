import useSWR from 'swr';
import { getAllRegionsAction } from '@/app/actions/region.actions';
import { Region } from '@/shared/types/db';

const REGIONS_TTL = 30 * 60 * 1000;

async function fetchRegions(): Promise<Region[]> {
    const result = await getAllRegionsAction();
    if (!result.ok) throw new Error(result.error.message);
    return result.value;
}

export function useRegions() {
    const { data, error, isLoading, mutate } = useSWR('regions', fetchRegions, {
        dedupingInterval: REGIONS_TTL,
        revalidateOnFocus: false,
    });

    return {
        regions: data ?? [],
        isLoading,
        error: error?.message ?? null,
        mutate,
    };
}

export function useRegionByCode(code: string | null) {
    const { regions, isLoading, error } = useRegions();

    const region = code
        ? regions.find(r => r.code.toLowerCase() === code.toLowerCase()) ?? null
        : null;

    return { region, isLoading, error };
}
