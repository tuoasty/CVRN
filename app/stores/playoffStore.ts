import { create } from 'zustand';
import { PlayoffBracket } from '@/shared/types/db';
import {
    generatePlayoffBracketAction,
    getPlayoffBracketBySeasonIdAction, resetPlayoffBracketsAction
} from '@/app/actions/playoff.actions';
import { CacheEntry, createCacheEntry, isCacheValid, setupAutoEviction } from './storeUtils';
import { clientLogger } from "@/app/utils/clientLogger";
import { GeneratePlayoffBracketInput } from '@/server/dto/playoff.dto';

type PlayoffState = {
    bracketsCache: Map<string, CacheEntry<PlayoffBracket[]>>;
    loading: boolean;
    error: string | null;

    fetchBrackets: (seasonId: string) => Promise<PlayoffBracket[]>;
    generateBracket: (input: GeneratePlayoffBracketInput) => Promise<boolean>;
    resetBrackets: (seasonId: string) => Promise<boolean>;
    clearCache: () => void;
};

const BRACKETS_TTL = 5 * 60 * 1000;

const bracketsCache = new Map<string, CacheEntry<PlayoffBracket[]>>();

const cleanupInterval = setupAutoEviction(bracketsCache, 60000);

export const usePlayoffStore = create<PlayoffState>((set, get) => ({
    bracketsCache,
    loading: false,
    error: null,

    fetchBrackets: async (seasonId: string) => {
        const { bracketsCache } = get();
        const cached = bracketsCache.get(seasonId);

        if (isCacheValid(cached)) {
            clientLogger.info('PlayoffStore', 'Using cached brackets', { seasonId, count: cached?.data.length });
            return cached!.data;
        }

        clientLogger.info('PlayoffStore', 'Fetching playoff brackets', { seasonId });
        set({ loading: true, error: null });

        try {
            const result = await getPlayoffBracketBySeasonIdAction(seasonId);

            if (!result.ok) {
                clientLogger.error('PlayoffStore', 'Failed to fetch brackets', { seasonId, error: result.error });
                set({ error: result.error.message, loading: false });
                return [];
            }
            bracketsCache.set(seasonId, createCacheEntry(result.value, BRACKETS_TTL));
            clientLogger.info('PlayoffStore', 'Brackets fetched successfully', { seasonId, count: result.value.length });
            set({ bracketsCache, loading: false });
            return result.value;
        } catch (error) {
            clientLogger.error('PlayoffStore', 'Exception fetching brackets', { seasonId, error });
            set({ error: 'Failed to fetch brackets', loading: false });
            return [];
        }
    },

    generateBracket: async (input: GeneratePlayoffBracketInput) => {
        clientLogger.info('PlayoffStore', 'Generating playoff bracket', { seasonId: input.seasonId });
        set({ loading: true, error: null });

        try {
            const result = await generatePlayoffBracketAction(input);

            if (!result.ok) {
                clientLogger.error('PlayoffStore', 'Failed to generate playoff bracket', {
                    seasonId: input.seasonId,
                    error: result.error
                });
                set({ error: result.error.message, loading: false });
                return false;
            }

            clientLogger.info('PlayoffStore', 'Playoff bracket generated successfully', {
                seasonId: input.seasonId,
                matchesCreated: result.value.matchesCreated,
                bracketsCreated: result.value.bracketsCreated
            });

            const { bracketsCache } = get();
            bracketsCache.delete(input.seasonId);

            set({ bracketsCache, loading: false });
            return true;
        } catch (error) {
            clientLogger.error('PlayoffStore', 'Exception generating playoff bracket', {
                seasonId: input.seasonId,
                error
            });
            set({ error: 'Failed to generate playoff bracket', loading: false });
            return false;
        }
    },

    resetBrackets: async (seasonId: string) => {
        clientLogger.info('PlayoffStore', 'Resetting playoff brackets', { seasonId });
        set({ loading: true, error: null });

        try {
            const result = await resetPlayoffBracketsAction(seasonId);

            if (!result.ok) {
                clientLogger.error('PlayoffStore', 'Failed to reset playoff brackets', {
                    seasonId,
                    error: result.error
                });
                set({ error: result.error.message, loading: false });
                return false;
            }

            clientLogger.info('PlayoffStore', 'Playoff brackets reset successfully', { seasonId });

            const { bracketsCache } = get();
            bracketsCache.delete(seasonId);

            set({ bracketsCache, loading: false });
            return true;
        } catch (error) {
            clientLogger.error('PlayoffStore', 'Exception resetting playoff brackets', {
                seasonId,
                error
            });
            set({ error: 'Failed to reset playoff brackets', loading: false });
            return false;
        }
    },

    clearCache: () => {
        bracketsCache.clear();
        clientLogger.info('PlayoffStore', 'Cache cleared');
        set({ error: null });
    },
}));

if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
        cleanupInterval();
    });
}