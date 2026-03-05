import { create } from 'zustand';
import { StandingWithInfo } from '@/server/dto/standing.dto';
import { CacheEntry, createCacheEntry, isCacheValid, setupAutoEviction } from './storeUtils';
import { clientLogger } from "@/app/utils/clientLogger";
import {getStandingsAction} from "@/app/actions/standing.action";

type StandingsState = {
    standingsCache: Map<string, CacheEntry<StandingWithInfo[]>>;
    loading: boolean;
    error: string | null;

    fetchStandings: (params: {
        seasonId?: string;
        regionId?: string;
    }) => Promise<StandingWithInfo[]>;
    clearCache: () => void;
};

const STANDINGS_TTL = 2 * 60 * 1000;

const standingsCache = new Map<string, CacheEntry<StandingWithInfo[]>>();

const cleanupInterval = setupAutoEviction(standingsCache, 60000);

const createStandingsCacheKey = (seasonId?: string, regionId?: string) =>
    `${seasonId || 'all'}-${regionId || 'all'}`;

export const useStandingsStore = create<StandingsState>((set, get) => ({
    standingsCache,
    loading: false,
    error: null,

    fetchStandings: async (params) => {
        const { standingsCache } = get();
        const cacheKey = createStandingsCacheKey(params.seasonId, params.regionId);
        const cached = standingsCache.get(cacheKey);

        if (cached && isCacheValid(cached)) {
            clientLogger.info('StandingsStore', 'Using cached standings', {
                seasonId: params.seasonId,
                regionId: params.regionId,
                count: cached.data.length
            });
            return cached.data;
        }

        clientLogger.info('StandingsStore', 'Fetching standings from server', params);
        set({ loading: true, error: null });

        try {
            const result = await getStandingsAction(params);

            if (!result.ok) {
                clientLogger.error('StandingsStore', 'Failed to fetch standings', { error: result.error });
                set({ error: result.error.message, loading: false });
                return [];
            }

            standingsCache.set(cacheKey, createCacheEntry(result.value, STANDINGS_TTL));
            clientLogger.info('StandingsStore', 'Standings fetched successfully', { count: result.value.length });

            set({ standingsCache, loading: false });
            return result.value;
        } catch (error) {
            clientLogger.error('StandingsStore', 'Exception fetching standings', { error });
            set({ error: 'Failed to fetch standings', loading: false });
            return [];
        }
    },

    clearCache: () => {
        standingsCache.clear();
        set({ error: null });
        clientLogger.info('StandingsStore', 'Cache cleared');
    },
}));

if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
        cleanupInterval();
    });
}