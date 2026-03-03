import { create } from 'zustand';
import { Official } from '@/shared/types/db';
import { RobloxUserWithAvatar } from '@/shared/types/roblox';
import {
    searchOfficialsByNameAction,
    saveOfficialAction,
    getAllOfficialsAction,
    getMatchOfficialsAction,
    assignOfficialToMatchAction,
    removeOfficialFromMatchAction,
    getMatchOfficialsByTypeAction,
    assignMultipleOfficialsToMatchAction,
    removeAllOfficialsOfTypeAction
} from '@/app/actions/matchOfficial.actions';
import { CacheEntry, createCacheEntry, isCacheValid, setupAutoEviction } from './storeUtils';
import { clientLogger } from '@/app/utils/clientLogger';
import { MatchOfficialWithDetails } from '@/server/services/matchOfficial.service';
import { OfficialType } from '@/server/dto/matchOfficial.dto';

type OfficialState = {
    officialsCache: CacheEntry<Official[]> | undefined;
    searchResultsCache: Map<string, CacheEntry<RobloxUserWithAvatar[]>>;
    matchOfficialsCache: Map<string, CacheEntry<MatchOfficialWithDetails[]>>;
    loading: boolean;
    error: string | null;

    searchOfficials: (username: string) => Promise<RobloxUserWithAvatar[]>;
    saveOfficial: (robloxUserId: string, username: string, avatarUrl: string) => Promise<Official | null>;
    fetchAllOfficials: () => Promise<void>;
    fetchMatchOfficials: (matchId: string) => Promise<void>;
    fetchMatchOfficialsByType: (matchId: string, officialType: OfficialType) => Promise<MatchOfficialWithDetails[]>;
    assignOfficialToMatch: (matchId: string, officialId: string, officialType: OfficialType) => Promise<boolean>;
    assignMultipleOfficials: (matchId: string, officialIds: string[], officialType: OfficialType) => Promise<boolean>;
    removeOfficialFromMatch: (matchId: string, officialId: string, officialType: OfficialType) => Promise<boolean>;
    removeAllOfficialsOfType: (matchId: string, officialType: OfficialType) => Promise<boolean>;
    clearCache: () => void;
};

const OFFICIALS_TTL = 30 * 60 * 1000;
const SEARCH_RESULTS_TTL = 5 * 60 * 1000;

const searchResultsCache = new Map<string, CacheEntry<RobloxUserWithAvatar[]>>();
const matchOfficialsCache = new Map<string, CacheEntry<MatchOfficialWithDetails[]>>();

const searchCleanup = setupAutoEviction(searchResultsCache, 60000);
const matchOfficialsCleanup = setupAutoEviction(matchOfficialsCache, 60000);

export const useOfficialStore = create<OfficialState>((set, get) => ({
    officialsCache: undefined,
    searchResultsCache,
    matchOfficialsCache,
    loading: false,
    error: null,

    searchOfficials: async (username: string) => {
        const { searchResultsCache } = get();
        const cached = searchResultsCache.get(username.toLowerCase());

        if (isCacheValid(cached)) {
            clientLogger.info('OfficialStore', 'Using cached search results', { username, count: cached!.data.length });
            return cached!.data;
        }

        clientLogger.info('OfficialStore', 'Searching officials', { username });
        set({ loading: true, error: null });

        try {
            const result = await searchOfficialsByNameAction(username);

            if (!result.ok) {
                clientLogger.error('OfficialStore', 'Failed to search officials', { username, error: result.error });
                set({ error: result.error.message, loading: false });
                return [];
            }

            searchResultsCache.set(username.toLowerCase(), createCacheEntry(result.value, SEARCH_RESULTS_TTL));
            clientLogger.info('OfficialStore', 'Officials search completed', { username, count: result.value.length });
            set({ searchResultsCache, loading: false });

            return result.value;
        } catch (error) {
            clientLogger.error('OfficialStore', 'Exception searching officials', { username, error });
            set({ error: 'Failed to search officials', loading: false });
            return [];
        }
    },

    saveOfficial: async (robloxUserId: string, username: string, avatarUrl: string) => {
        clientLogger.info('OfficialStore', 'Saving official', { robloxUserId, username });
        set({ loading: true, error: null });

        try {
            const result = await saveOfficialAction({
                robloxUserId,
                username,
                avatarUrl,
            });

            if (!result.ok) {
                clientLogger.error('OfficialStore', 'Failed to save official', { robloxUserId, error: result.error });
                set({ error: result.error.message, loading: false });
                return null;
            }

            clientLogger.info('OfficialStore', 'Official saved successfully', { robloxUserId });
            set({ loading: false });

            const { officialsCache } = get();
            if (officialsCache) {
                const updatedOfficials = [result.value, ...officialsCache.data];
                set({ officialsCache: createCacheEntry(updatedOfficials, OFFICIALS_TTL) });
            }

            return result.value;
        } catch (error) {
            clientLogger.error('OfficialStore', 'Exception saving official', { robloxUserId, error });
            set({ error: 'Failed to save official', loading: false });
            return null;
        }
    },

    fetchAllOfficials: async () => {
        const { officialsCache } = get();

        if (isCacheValid(officialsCache)) {
            clientLogger.info('OfficialStore', 'Using cached officials', { count: officialsCache?.data.length });
            return;
        }

        clientLogger.info('OfficialStore', 'Fetching all officials');
        set({ loading: true, error: null });

        try {
            const result = await getAllOfficialsAction();

            if (!result.ok) {
                clientLogger.error('OfficialStore', 'Failed to fetch officials', { error: result.error });
                set({ error: result.error.message, loading: false });
                return;
            }

            clientLogger.info('OfficialStore', 'Officials fetched successfully', { count: result.value.length });
            set({
                officialsCache: createCacheEntry(result.value, OFFICIALS_TTL),
                loading: false,
            });
        } catch (error) {
            clientLogger.error('OfficialStore', 'Exception fetching officials', { error });
            set({ error: 'Failed to fetch officials', loading: false });
        }
    },

    fetchMatchOfficials: async (matchId: string) => {
        const { matchOfficialsCache } = get();
        const cached = matchOfficialsCache.get(matchId);

        if (isCacheValid(cached)) {
            clientLogger.info('OfficialStore', 'Using cached match officials', { matchId, count: cached?.data.length });
            return;
        }

        clientLogger.info('OfficialStore', 'Fetching match officials', { matchId });
        set({ loading: true, error: null });

        try {
            const result = await getMatchOfficialsAction(matchId);

            if (!result.ok) {
                clientLogger.error('OfficialStore', 'Failed to fetch match officials', { matchId, error: result.error });
                set({ error: result.error.message, loading: false });
                return;
            }

            matchOfficialsCache.set(matchId, createCacheEntry(result.value, OFFICIALS_TTL));
            clientLogger.info('OfficialStore', 'Match officials fetched successfully', { matchId, count: result.value.length });
            set({ matchOfficialsCache, loading: false });
        } catch (error) {
            clientLogger.error('OfficialStore', 'Exception fetching match officials', { matchId, error });
            set({ error: 'Failed to fetch match officials', loading: false });
        }
    },

    fetchMatchOfficialsByType: async (matchId: string, officialType: OfficialType) => {
        clientLogger.info('OfficialStore', 'Fetching match officials by type', { matchId, officialType });

        try {
            const result = await getMatchOfficialsByTypeAction(matchId, officialType);

            if (!result.ok) {
                clientLogger.error('OfficialStore', 'Failed to fetch match officials by type', { matchId, officialType, error: result.error });
                return [];
            }

            clientLogger.info('OfficialStore', 'Match officials by type fetched successfully', { matchId, officialType, count: result.value.length });
            return result.value;
        } catch (error) {
            clientLogger.error('OfficialStore', 'Exception fetching match officials by type', { matchId, officialType, error });
            return [];
        }
    },

    assignOfficialToMatch: async (matchId: string, officialId: string, officialType: OfficialType) => {
        clientLogger.info('OfficialStore', 'Assigning official to match', { matchId, officialId, officialType });
        set({ loading: true, error: null });

        try {
            const result = await assignOfficialToMatchAction({ matchId, officialId, officialType });

            if (!result.ok) {
                clientLogger.error('OfficialStore', 'Failed to assign official', { matchId, officialId, error: result.error });
                set({ error: result.error.message, loading: false });
                return false;
            }

            clientLogger.info('OfficialStore', 'Official assigned successfully', { matchId, officialId, officialType });

            matchOfficialsCache.delete(matchId);
            set({ matchOfficialsCache, loading: false });

            return true;
        } catch (error) {
            clientLogger.error('OfficialStore', 'Exception assigning official', { matchId, officialId, error });
            set({ error: 'Failed to assign official', loading: false });
            return false;
        }
    },

    assignMultipleOfficials: async (matchId: string, officialIds: string[], officialType: OfficialType) => {
        clientLogger.info('OfficialStore', 'Assigning multiple officials to match', { matchId, officialIds, officialType });
        set({ loading: true, error: null });

        try {
            const result = await assignMultipleOfficialsToMatchAction({ matchId, officialIds, officialType });

            if (!result.ok) {
                clientLogger.error('OfficialStore', 'Failed to assign multiple officials', { matchId, officialIds, error: result.error });
                set({ error: result.error.message, loading: false });
                return false;
            }

            clientLogger.info('OfficialStore', 'Multiple officials assigned successfully', { matchId, count: officialIds.length, officialType });

            matchOfficialsCache.delete(matchId);
            set({ matchOfficialsCache, loading: false });

            return true;
        } catch (error) {
            clientLogger.error('OfficialStore', 'Exception assigning multiple officials', { matchId, officialIds, error });
            set({ error: 'Failed to assign multiple officials', loading: false });
            return false;
        }
    },

    removeOfficialFromMatch: async (matchId: string, officialId: string, officialType: OfficialType) => {
        clientLogger.info('OfficialStore', 'Removing official from match', { matchId, officialId, officialType });
        set({ loading: true, error: null });

        try {
            const result = await removeOfficialFromMatchAction(matchId, officialId, officialType);

            if (!result.ok) {
                clientLogger.error('OfficialStore', 'Failed to remove official', { matchId, officialId, error: result.error });
                set({ error: result.error.message, loading: false });
                return false;
            }

            clientLogger.info('OfficialStore', 'Official removed successfully', { matchId, officialId, officialType });

            matchOfficialsCache.delete(matchId);
            set({ matchOfficialsCache, loading: false });

            return true;
        } catch (error) {
            clientLogger.error('OfficialStore', 'Exception removing official', { matchId, officialId, error });
            set({ error: 'Failed to remove official', loading: false });
            return false;
        }
    },

    removeAllOfficialsOfType: async (matchId: string, officialType: OfficialType) => {
        clientLogger.info('OfficialStore', 'Removing all officials of type from match', { matchId, officialType });
        set({ loading: true, error: null });

        try {
            const result = await removeAllOfficialsOfTypeAction(matchId, officialType);

            if (!result.ok) {
                clientLogger.error('OfficialStore', 'Failed to remove all officials of type', { matchId, officialType, error: result.error });
                set({ error: result.error.message, loading: false });
                return false;
            }

            clientLogger.info('OfficialStore', 'All officials of type removed successfully', { matchId, officialType });

            matchOfficialsCache.delete(matchId);
            set({ matchOfficialsCache, loading: false });

            return true;
        } catch (error) {
            clientLogger.error('OfficialStore', 'Exception removing all officials of type', { matchId, officialType, error });
            set({ error: 'Failed to remove all officials of type', loading: false });
            return false;
        }
    },

    clearCache: () => {
        searchResultsCache.clear();
        matchOfficialsCache.clear();
        clientLogger.info('OfficialStore', 'Cache cleared');
        set({ officialsCache: undefined, error: null });
    },
}));

if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
        searchCleanup();
        matchOfficialsCleanup();
    });
}