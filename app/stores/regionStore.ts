import { create } from 'zustand';
import { Region } from '@/shared/types/db';
import { getAllRegionsAction } from '@/app/actions/region.actions';
import { CacheEntry, createCacheEntry, isCacheValid, setupAutoEviction } from './storeUtils';
import { clientLogger } from "@/app/utils/clientLogger";

type RegionsState = {
    allRegionsCache: CacheEntry<Region[]> | undefined;
    regionByCodeCache: Map<string, CacheEntry<Region>>;
    loading: boolean;
    error: string | null;

    fetchAllRegions: () => Promise<void>;
    fetchRegionByCode: (code: string) => Promise<void>;
    clearCache: () => void;
};

const REGIONS_LIST_TTL = 30 * 60 * 1000;
const REGION_DETAILS_TTL = 30 * 60 * 1000;

const regionByCodeCache = new Map<string, CacheEntry<Region>>();

const cleanupInterval = setupAutoEviction(regionByCodeCache, 60000);

export const useRegionsStore = create<RegionsState>((set, get) => ({
    allRegionsCache: undefined,
    regionByCodeCache,
    loading: false,
    error: null,

    fetchAllRegions: async () => {
        const { allRegionsCache } = get();

        if (isCacheValid(allRegionsCache)) {
            clientLogger.info('RegionsStore', 'Using cached regions list', { count: allRegionsCache?.data.length });
            return;
        }

        clientLogger.info('RegionsStore', 'Fetching regions from server');
        set({ loading: true, error: null });

        try {
            const result = await getAllRegionsAction();

            if (!result.ok) {
                clientLogger.error('RegionsStore', 'Failed to fetch regions', { error: result.error });
                set({ error: result.error.message, loading: false });
                return;
            }

            clientLogger.info('RegionsStore', 'Regions fetched successfully', { count: result.value.length });
            set({
                allRegionsCache: createCacheEntry(result.value, REGIONS_LIST_TTL),
                loading: false,
            });
        } catch (error) {
            clientLogger.error('RegionsStore', 'Exception during fetch', { error });
            set({ error: 'Failed to fetch regions', loading: false });
        }
    },

    fetchRegionByCode: async (code: string) => {
        const { regionByCodeCache, allRegionsCache } = get();
        const cached = regionByCodeCache.get(code.toLowerCase());

        if (isCacheValid(cached)) {
            clientLogger.info('RegionsStore', 'Using cached region', { code });
            return;
        }

        if (allRegionsCache && isCacheValid(allRegionsCache)) {
            const region = allRegionsCache.data.find(r => r.code.toLowerCase() === code.toLowerCase());
            if (region) {
                regionByCodeCache.set(code.toLowerCase(), createCacheEntry(region, REGION_DETAILS_TTL));
                clientLogger.info('RegionsStore', 'Region found in allRegions cache', { code });
                set({ regionByCodeCache });
                return;
            }
        }

        await get().fetchAllRegions();
        const { allRegionsCache: updatedCache } = get();

        if (updatedCache && isCacheValid(updatedCache)) {
            const region = updatedCache.data.find(r => r.code.toLowerCase() === code.toLowerCase());
            if (region) {
                regionByCodeCache.set(code.toLowerCase(), createCacheEntry(region, REGION_DETAILS_TTL));
                set({ regionByCodeCache });
            }
        }
    },

    clearCache: () => {
        regionByCodeCache.clear();
        set({ allRegionsCache: undefined, error: null });
        clientLogger.info('RegionsStore', 'Cache cleared');
    },
}));

if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
        cleanupInterval();
    });
}