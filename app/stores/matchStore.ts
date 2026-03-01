import { create } from 'zustand';
import { Match, Team } from '@/shared/types/db';
import { getAllMatchesAction, getAvailableTeamsForWeekAction } from '@/app/actions/match.actions';
import { CacheEntry, createCacheEntry, isCacheValid, setupAutoEviction } from './storeUtils';
import { clientLogger } from "@/app/utils/clientLogger";

type MatchesState = {
    matchesCache: CacheEntry<Match[]> | undefined;
    availableTeamsCache: Map<string, CacheEntry<Team[]>>;
    loading: boolean;
    error: string | null;

    fetchAllMatches: () => Promise<void>;
    fetchAvailableTeams: (seasonId: string, week: number) => Promise<void>;
    clearCache: () => void;
};

const MATCHES_TTL = 2 * 60 * 1000;
const AVAILABLE_TEAMS_TTL = 60 * 1000;

const availableTeamsCache = new Map<string, CacheEntry<Team[]>>();

const cleanupInterval = setupAutoEviction(availableTeamsCache, 60000);

export const useMatchesStore = create<MatchesState>((set, get) => ({
    matchesCache: undefined,
    availableTeamsCache,
    loading: false,
    error: null,

    fetchAllMatches: async () => {
        const { matchesCache } = get();

        if (isCacheValid(matchesCache)) {
            clientLogger.info('MatchesStore', 'Using cached matches', { count: matchesCache?.data.length });
            return;
        }

        clientLogger.info('MatchesStore', 'Fetching all matches');
        set({ loading: true, error: null });

        try {
            const result = await getAllMatchesAction();

            if (!result.ok) {
                clientLogger.error('MatchesStore', 'Failed to fetch matches', { error: result.error });
                set({ error: result.error.message, loading: false });
                return;
            }

            clientLogger.info('MatchesStore', 'Matches fetched successfully', { count: result.value.length });
            set({
                matchesCache: createCacheEntry(result.value, MATCHES_TTL),
                loading: false,
            });
        } catch (error) {
            clientLogger.error('MatchesStore', 'Exception fetching matches', { error });
            set({ error: 'Failed to fetch matches', loading: false });
        }
    },

    fetchAvailableTeams: async (seasonId: string, week: number) => {
        const cacheKey = `${seasonId}-${week}`;
        const { availableTeamsCache } = get();
        const cached = availableTeamsCache.get(cacheKey);

        if (isCacheValid(cached)) {
            clientLogger.info('MatchesStore', 'Using cached available teams', { seasonId, week, count: cached?.data.length });
            return;
        }

        clientLogger.info('MatchesStore', 'Fetching available teams', { seasonId, week });
        set({ loading: true, error: null });

        try {
            const result = await getAvailableTeamsForWeekAction({ seasonId, week });

            if (!result.ok) {
                clientLogger.error('MatchesStore', 'Failed to fetch available teams', { seasonId, week, error: result.error });
                set({ error: result.error.message, loading: false });
                return;
            }

            availableTeamsCache.set(cacheKey, createCacheEntry(result.value, AVAILABLE_TEAMS_TTL));
            clientLogger.info('MatchesStore', 'Available teams fetched successfully', { seasonId, week, count: result.value.length });
            set({ availableTeamsCache, loading: false });
        } catch (error) {
            clientLogger.error('MatchesStore', 'Exception fetching available teams', { seasonId, week, error });
            set({ error: 'Failed to fetch available teams', loading: false });
        }
    },

    clearCache: () => {
        availableTeamsCache.clear();
        clientLogger.info('MatchesStore', 'Cache cleared');
        set({ matchesCache: undefined, error: null });
    },
}));

if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
        cleanupInterval();
    });
}