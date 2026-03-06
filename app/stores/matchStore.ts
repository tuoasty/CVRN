import { create } from 'zustand';
import { Match, MatchSet, Team } from '@/shared/types/db';
import {
    completeMatchAction,
    getAllMatchesAction,
    getAvailableTeamsForWeekAction,
    getMatchesForWeekAction,
    getMatchSetsAction,
    getWeekScheduleAction,
    updateMatchResultsAction,
    updateMatchScheduleAction,
    voidMatchAction,
} from '@/app/actions/match.actions';
import { CacheEntry, createCacheEntry, isCacheValid, setupAutoEviction } from './storeUtils';
import { clientLogger } from '@/app/utils/clientLogger';
import { CompleteMatchInput, MatchWithDetails, UpdateMatchScheduleInput, VoidMatchInput } from '@/server/dto/match.dto';

type MatchesState = {
    matchesCache: CacheEntry<Match[]> | undefined;
    availableTeamsCache: Map<string, CacheEntry<Team[]>>;
    matchesForWeekCache: Map<string, CacheEntry<Match[]>>;
    matchSetsCache: Map<string, CacheEntry<MatchSet[]>>;
    weekScheduleCache: Map<string, CacheEntry<MatchWithDetails[]>>;
    loading: boolean;
    error: string | null;

    fetchAllMatches: () => Promise<void>;
    fetchAvailableTeams: (seasonId: string, week: number) => Promise<void>;
    fetchMatchesForWeek: (seasonId: string, week: number) => Promise<void>;
    fetchMatchSets: (matchId: string) => Promise<void>;
    fetchWeekSchedule: (seasonId: string, week: number) => Promise<void>;
    updateMatchSchedule: (input: UpdateMatchScheduleInput) => Promise<boolean>;
    completeMatch: (input: CompleteMatchInput) => Promise<boolean>;
    voidMatch: (input: VoidMatchInput) => Promise<boolean>;
    updateMatchResults: (input: CompleteMatchInput) => Promise<boolean>;
    clearCache: () => void;
};

const MATCHES_TTL = 2 * 60 * 1000;
const AVAILABLE_TEAMS_TTL = 60 * 1000;

const availableTeamsCache = new Map<string, CacheEntry<Team[]>>();
const matchesForWeekCache = new Map<string, CacheEntry<Match[]>>();
const matchSetsCache = new Map<string, CacheEntry<MatchSet[]>>();
const weekScheduleCache = new Map<string, CacheEntry<MatchWithDetails[]>>();

const cleanupAvailable = setupAutoEviction(availableTeamsCache, 60000);
const cleanupWeek = setupAutoEviction(matchesForWeekCache, 60000);
const cleanupSets = setupAutoEviction(matchSetsCache, 60000);
const cleanupSchedule = setupAutoEviction(weekScheduleCache, 60000);

export const useMatchesStore = create<MatchesState>((set, get) => ({
    matchesCache: undefined,
    availableTeamsCache,
    matchesForWeekCache,
    matchSetsCache,
    weekScheduleCache,
    loading: false,
    error: null,

    fetchAllMatches: async () => {
        const { matchesCache } = get();

        if (isCacheValid(matchesCache)) return;

        set({ loading: true, error: null });

        try {
            const result = await getAllMatchesAction();

            if (!result.ok) {
                set({ error: result.error.message, loading: false });
                return;
            }

            set({ matchesCache: createCacheEntry(result.value, MATCHES_TTL), loading: false });
        } catch (error) {
            clientLogger.error('MatchesStore', 'Exception fetching matches', { error });
            set({ error: 'Failed to fetch matches', loading: false });
        }
    },

    fetchAvailableTeams: async (seasonId: string, week: number) => {
        const cacheKey = `${seasonId}-${week}`;
        const cached = availableTeamsCache.get(cacheKey);

        if (isCacheValid(cached)) return;

        set({ loading: true, error: null });

        try {
            const result = await getAvailableTeamsForWeekAction({ seasonId, week });

            if (!result.ok) {
                set({ error: result.error.message, loading: false });
                return;
            }

            availableTeamsCache.set(cacheKey, createCacheEntry(result.value, AVAILABLE_TEAMS_TTL));
            set({ availableTeamsCache, loading: false });
        } catch (error) {
            clientLogger.error('MatchesStore', 'Exception fetching available teams', { seasonId, week, error });
            set({ error: 'Failed to fetch available teams', loading: false });
        }
    },

    fetchMatchesForWeek: async (seasonId: string, week: number) => {
        const cacheKey = `${seasonId}-${week}`;
        const cached = matchesForWeekCache.get(cacheKey);

        if (isCacheValid(cached)) return;

        set({ loading: true, error: null });

        try {
            const result = await getMatchesForWeekAction({ seasonId, week });

            if (!result.ok) {
                set({ error: result.error.message, loading: false });
                return;
            }

            matchesForWeekCache.set(cacheKey, createCacheEntry(result.value, MATCHES_TTL));
            set({ matchesForWeekCache, loading: false });
        } catch (error) {
            clientLogger.error('MatchesStore', 'Exception fetching matches for week', { seasonId, week, error });
            set({ error: 'Failed to fetch matches for week', loading: false });
        }
    },

    fetchMatchSets: async (matchId: string) => {
        const cached = matchSetsCache.get(matchId);

        if (isCacheValid(cached)) return;

        try {
            const result = await getMatchSetsAction({ matchId });

            if (!result.ok) {
                clientLogger.error('MatchesStore', 'Failed to fetch match sets', { matchId, error: result.error });
                return;
            }

            matchSetsCache.set(matchId, createCacheEntry(result.value, MATCHES_TTL));
            set({ matchSetsCache });
        } catch (error) {
            clientLogger.error('MatchesStore', 'Exception fetching match sets', { matchId, error });
        }
    },

    fetchWeekSchedule: async (seasonId: string, week: number) => {
        const cacheKey = `${seasonId}-${week}`;
        const cached = weekScheduleCache.get(cacheKey);

        if (isCacheValid(cached)) return;

        set({ loading: true, error: null });

        try {
            const result = await getWeekScheduleAction({ seasonId, week });

            if (!result.ok) {
                clientLogger.error('MatchesStore', 'Failed to fetch week schedule', { seasonId, week, error: result.error });
                set({ error: result.error.message, loading: false });
                return;
            }

            weekScheduleCache.set(cacheKey, createCacheEntry(result.value, MATCHES_TTL));
            set({ weekScheduleCache, loading: false });
        } catch (error) {
            clientLogger.error('MatchesStore', 'Exception fetching week schedule', { seasonId, week, error });
            set({ error: 'Failed to fetch week schedule', loading: false });
        }
    },

    updateMatchSchedule: async (input: UpdateMatchScheduleInput) => {
        set({ loading: true, error: null });

        try {
            const result = await updateMatchScheduleAction(input);

            if (!result.ok) {
                set({ error: result.error.message, loading: false });
                return false;
            }

            const updatedMatch = result.value;
            const { matchesCache } = get();

            if (matchesCache) {
                set({
                    matchesCache: createCacheEntry(
                        matchesCache.data.map(m => m.id === updatedMatch.id ? updatedMatch : m),
                        MATCHES_TTL
                    ),
                });
            }

            matchesForWeekCache.forEach((cache, key) => {
                matchesForWeekCache.set(key, createCacheEntry(
                    cache.data.map(m => m.id === updatedMatch.id ? updatedMatch : m),
                    MATCHES_TTL
                ));
            });

            weekScheduleCache.clear();
            set({ matchesForWeekCache, weekScheduleCache, loading: false });
            return true;
        } catch (error) {
            clientLogger.error('MatchesStore', 'Exception updating match schedule', { matchId: input.matchId, error });
            set({ error: 'Failed to update match schedule', loading: false });
            return false;
        }
    },

    completeMatch: async (input: CompleteMatchInput) => {
        set({ loading: true, error: null });

        try {
            const result = await completeMatchAction(input);

            if (!result.ok) {
                set({ error: result.error.message, loading: false });
                return false;
            }

            const completedMatch = result.value;
            const { matchesCache } = get();

            if (matchesCache) {
                set({
                    matchesCache: createCacheEntry(
                        matchesCache.data.map(m => m.id === completedMatch.id ? completedMatch : m),
                        MATCHES_TTL
                    ),
                });
            }

            matchesForWeekCache.forEach((cache, key) => {
                matchesForWeekCache.set(key, createCacheEntry(
                    cache.data.map(m => m.id === completedMatch.id ? completedMatch : m),
                    MATCHES_TTL
                ));
            });

            weekScheduleCache.clear();
            set({ matchesForWeekCache, weekScheduleCache, loading: false });
            return true;
        } catch (error) {
            clientLogger.error('MatchesStore', 'Exception completing match', { matchId: input.matchId, error });
            set({ error: 'Failed to complete match', loading: false });
            return false;
        }
    },

    voidMatch: async (input: VoidMatchInput) => {
        set({ loading: true, error: null });

        try {
            const result = await voidMatchAction(input);

            if (!result.ok) {
                set({ error: result.error.message, loading: false });
                return false;
            }

            const voidedMatch = result.value;
            const { matchesCache } = get();

            if (matchesCache) {
                set({
                    matchesCache: createCacheEntry(
                        matchesCache.data.map(m => m.id === voidedMatch.id ? voidedMatch : m),
                        MATCHES_TTL
                    ),
                });
            }

            matchesForWeekCache.forEach((cache, key) => {
                matchesForWeekCache.set(key, createCacheEntry(
                    cache.data.map(m => m.id === voidedMatch.id ? voidedMatch : m),
                    MATCHES_TTL
                ));
            });

            weekScheduleCache.clear();
            set({ matchesForWeekCache, weekScheduleCache, loading: false });
            return true;
        } catch (error) {
            clientLogger.error('MatchesStore', 'Exception voiding match', { matchId: input.matchId, error });
            set({ error: 'Failed to void match', loading: false });
            return false;
        }
    },

    updateMatchResults: async (input: CompleteMatchInput) => {
        set({ loading: true, error: null });

        try {
            const result = await updateMatchResultsAction(input);

            if (!result.ok) {
                set({ error: result.error.message, loading: false });
                return false;
            }

            const updatedMatch = result.value;
            const { matchesCache } = get();

            if (matchesCache) {
                set({
                    matchesCache: createCacheEntry(
                        matchesCache.data.map(m => m.id === updatedMatch.id ? updatedMatch : m),
                        MATCHES_TTL
                    ),
                });
            }

            matchesForWeekCache.forEach((cache, key) => {
                matchesForWeekCache.set(key, createCacheEntry(
                    cache.data.map(m => m.id === updatedMatch.id ? updatedMatch : m),
                    MATCHES_TTL
                ));
            });

            matchSetsCache.delete(input.matchId);
            weekScheduleCache.clear();
            set({ matchesForWeekCache, matchSetsCache, weekScheduleCache, loading: false });
            return true;
        } catch (error) {
            clientLogger.error('MatchesStore', 'Exception updating match results', { matchId: input.matchId, error });
            set({ error: 'Failed to update match results', loading: false });
            return false;
        }
    },

    clearCache: () => {
        availableTeamsCache.clear();
        matchesForWeekCache.clear();
        matchSetsCache.clear();
        weekScheduleCache.clear();
        set({ matchesCache: undefined, weekScheduleCache, matchSetsCache, error: null });
    },
}));

if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
        cleanupAvailable();
        cleanupWeek();
        cleanupSets();
        cleanupSchedule();
    });
}