import { create } from 'zustand';
import { Match, Team } from '@/shared/types/db';
import { getAllMatchesAction, getAvailableTeamsForWeekAction, getMatchesForWeekAction } from '@/app/actions/match.actions';
import { CacheEntry, createCacheEntry, isCacheValid, setupAutoEviction } from './storeUtils';
import { clientLogger } from "@/app/utils/clientLogger";
import { updateMatchScheduleAction } from '@/app/actions/match.actions';
import { UpdateMatchScheduleInput } from '@/server/dto/match.dto';

type MatchesState = {
    matchesCache: CacheEntry<Match[]> | undefined;
    availableTeamsCache: Map<string, CacheEntry<Team[]>>;
    matchesForWeekCache: Map<string, CacheEntry<Match[]>>;
    loading: boolean;
    error: string | null;

    fetchAllMatches: () => Promise<void>;
    fetchAvailableTeams: (seasonId: string, week: number) => Promise<void>;
    fetchMatchesForWeek: (seasonId: string, week: number) => Promise<void>;
    updateMatchSchedule: (input: UpdateMatchScheduleInput) => Promise<boolean>;
    clearCache: () => void;
};

const MATCHES_TTL = 2 * 60 * 1000;
const AVAILABLE_TEAMS_TTL = 60 * 1000;

const availableTeamsCache = new Map<string, CacheEntry<Team[]>>();
const matchesForWeekCache = new Map<string, CacheEntry<Match[]>>();

const cleanupInterval = setupAutoEviction(availableTeamsCache, 60000);
const matchesCleanupInterval = setupAutoEviction(matchesForWeekCache, 60000);

export const useMatchesStore = create<MatchesState>((set, get) => ({
    matchesCache: undefined,
    availableTeamsCache,
    matchesForWeekCache,
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

    fetchMatchesForWeek: async (seasonId: string, week: number) => {
        const cacheKey = `${seasonId}-${week}`;
        const { matchesForWeekCache } = get();
        const cached = matchesForWeekCache.get(cacheKey);

        if (cached && isCacheValid(cached)) {
            clientLogger.info('MatchesStore', 'Using cached matches for week', { seasonId, week, count: cached.data.length });
            return;
        }

        clientLogger.info('MatchesStore', 'Fetching matches for week', { seasonId, week });
        set({ loading: true, error: null });

        try {
            const result = await getMatchesForWeekAction({ seasonId, week });

            if (!result.ok) {
                clientLogger.error('MatchesStore', 'Failed to fetch matches for week', { seasonId, week, error: result.error });
                set({ error: result.error.message, loading: false });
                return;
            }

            matchesForWeekCache.set(cacheKey, createCacheEntry(result.value, MATCHES_TTL));
            clientLogger.info('MatchesStore', 'Matches for week fetched successfully', { seasonId, week, count: result.value.length });
            set({ matchesForWeekCache, loading: false });
        } catch (error) {
            clientLogger.error('MatchesStore', 'Exception fetching matches for week', { seasonId, week, error });
            set({ error: 'Failed to fetch matches for week', loading: false });
        }
    },

    clearCache: () => {
        availableTeamsCache.clear();
        matchesForWeekCache.clear();
        clientLogger.info('MatchesStore', 'Cache cleared');
        set({ matchesCache: undefined, error: null });
    },

    updateMatchSchedule: async (input: UpdateMatchScheduleInput) => {
        clientLogger.info('MatchesStore', 'Updating match schedule', { matchId: input.matchId });
        set({ loading: true, error: null });

        try {
            const result = await updateMatchScheduleAction(input);

            if (!result.ok) {
                clientLogger.error('MatchesStore', 'Failed to update match schedule', {
                    matchId: input.matchId,
                    error: result.error
                });
                set({ error: result.error.message, loading: false });
                return false;
            }

            const updatedMatch = result.value;
            clientLogger.info('MatchesStore', 'Match schedule updated successfully', {
                matchId: input.matchId
            });

            const { matchesCache, matchesForWeekCache } = get();

            if (matchesCache) {
                const updatedMatches = matchesCache.data.map(m =>
                    m.id === updatedMatch.id ? updatedMatch : m
                );
                set({
                    matchesCache: createCacheEntry(updatedMatches, MATCHES_TTL),
                    loading: false
                });
            }

            matchesForWeekCache.forEach((cache, key) => {
                const updatedWeekMatches = cache.data.map(m =>
                    m.id === updatedMatch.id ? updatedMatch : m
                );
                matchesForWeekCache.set(key, createCacheEntry(updatedWeekMatches, MATCHES_TTL));
            });

            set({ matchesForWeekCache, loading: false });
            return true;
        } catch (error) {
            clientLogger.error('MatchesStore', 'Exception updating match schedule', {
                matchId: input.matchId,
                error
            });
            set({ error: 'Failed to update match schedule', loading: false });
            return false;
        }
    },
}));

if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
        cleanupInterval();
        matchesCleanupInterval();
    });
}