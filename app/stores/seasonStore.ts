import { create } from 'zustand';
import { Season } from '@/shared/types/db';
import { getAllSeasonsAction, getSeasonBySlugAndRegionAction } from '@/app/actions/season.actions';
import { CacheEntry, createCacheEntry, isCacheValid, setupAutoEviction } from './storeUtils';
import { clientLogger } from "@/app/utils/clientLogger";

type SeasonsState = {
    allSeasonsCache: CacheEntry<Season[]> | undefined;
    seasonBySlugCache: Map<string, CacheEntry<Season>>;
    loading: boolean;
    error: string | null;

    fetchAllSeasons: () => Promise<void>;
    fetchSeasonBySlugAndRegion: (slug: string, regionId: string) => Promise<void>;
    clearCache: () => void;
};

const SEASONS_LIST_TTL = 30 * 60 * 1000;
const SEASON_DETAILS_TTL = 30 * 60 * 1000;

const seasonBySlugCache = new Map<string, CacheEntry<Season>>();

const cleanupInterval = setupAutoEviction(seasonBySlugCache, 60000);

const createSeasonCacheKey = (slug: string, regionId: string) => `${slug}-${regionId}`;

export const useSeasonsStore = create<SeasonsState>((set, get) => ({
    allSeasonsCache: undefined,
    seasonBySlugCache,
    loading: false,
    error: null,

    fetchAllSeasons: async () => {
        const { allSeasonsCache } = get();

        if (isCacheValid(allSeasonsCache)) {
            clientLogger.info('SeasonsStore', 'Using cached seasons list', { count: allSeasonsCache?.data.length });
            return;
        }

        clientLogger.info('SeasonsStore', 'Fetching seasons from server');
        set({ loading: true, error: null });

        try {
            const result = await getAllSeasonsAction();

            if (!result.ok) {
                clientLogger.error('SeasonsStore', 'Failed to fetch seasons', { error: result.error });
                set({ error: result.error.message, loading: false });
                return;
            }

            clientLogger.info('SeasonsStore', 'Seasons fetched successfully', { count: result.value.length });
            set({
                allSeasonsCache: createCacheEntry(result.value, SEASONS_LIST_TTL),
                loading: false,
            });
        } catch (error) {
            clientLogger.error('SeasonsStore', 'Exception during fetch', { error });
            set({ error: 'Failed to fetch seasons', loading: false });
        }
    },

    fetchSeasonBySlugAndRegion: async (slug: string, regionId: string) => {
        const { seasonBySlugCache } = get();
        const cacheKey = createSeasonCacheKey(slug, regionId);
        const cached = seasonBySlugCache.get(cacheKey);

        if (isCacheValid(cached)) {
            clientLogger.info('SeasonsStore', 'Using cached season', { slug, regionId });
            return;
        }

        clientLogger.info('SeasonsStore', 'Fetching season', { slug, regionId });
        set({ loading: true, error: null });

        try {
            const result = await getSeasonBySlugAndRegionAction({ slug, regionId });

            if (!result.ok) {
                clientLogger.error('SeasonsStore', 'Failed to fetch season', { slug, regionId, error: result.error });
                set({ error: result.error.message, loading: false });
                return;
            }

            seasonBySlugCache.set(cacheKey, createCacheEntry(result.value, SEASON_DETAILS_TTL));
            clientLogger.info('SeasonsStore', 'Season fetched successfully', { slug, regionId });
            set({ seasonBySlugCache, loading: false });
        } catch (error) {
            clientLogger.error('SeasonsStore', 'Exception fetching season', { slug, regionId, error });
            set({ error: 'Failed to fetch season', loading: false });
        }
    },

    clearCache: () => {
        seasonBySlugCache.clear();
        set({ allSeasonsCache: undefined, error: null });
        clientLogger.info('SeasonsStore', 'Cache cleared');
    },
}));

if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
        cleanupInterval();
    });
}