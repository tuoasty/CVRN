import { create } from 'zustand';
import { Player } from '@/shared/types/db';
import { getTeamPlayersAction } from '@/app/actions/player.actions';
import { CacheEntry, createCacheEntry, isCacheValid, setupAutoEviction } from './storeUtils';
import { clientLogger } from "@/app/utils/clientLogger";

type PlayersState = {
    playersByTeamCache: Map<string, CacheEntry<Player[]>>;
    loading: boolean;
    error: string | null;

    fetchTeamPlayers: (teamId: string, seasonId: string) => Promise<void>;
    clearCache: () => void;
};

const TEAM_PLAYERS_TTL = 2 * 60 * 1000;

const playersByTeamCache = new Map<string, CacheEntry<Player[]>>();

const cleanupInterval = setupAutoEviction(playersByTeamCache, 60000);

export const usePlayersStore = create<PlayersState>((set, get) => ({
    playersByTeamCache,
    loading: false,
    error: null,

    fetchTeamPlayers: async (teamId: string, seasonId: string) => {
        const cacheKey = `${teamId}-${seasonId}`;
        const { playersByTeamCache } = get();
        const cached = playersByTeamCache.get(cacheKey);

        if (isCacheValid(cached)) {
            clientLogger.info('PlayersStore', 'Using cached team players', { teamId, seasonId, count: cached?.data.length });
            return;
        }

        clientLogger.info('PlayersStore', 'Fetching team players', { teamId, seasonId });
        set({ loading: true, error: null });

        try {
            const result = await getTeamPlayersAction({ teamId, seasonId });

            if (!result.ok) {
                clientLogger.error('PlayersStore', 'Failed to fetch team players', { teamId, seasonId, error: result.error });
                set({ error: result.error.message, loading: false });
                return;
            }

            playersByTeamCache.set(cacheKey, createCacheEntry(result.value, TEAM_PLAYERS_TTL));
            clientLogger.info('PlayersStore', 'Team players fetched successfully', { teamId, seasonId, count: result.value.length });
            set({ playersByTeamCache, loading: false });
        } catch (error) {
            clientLogger.error('PlayersStore', 'Exception fetching team players', { teamId, seasonId, error });
            set({ error: 'Failed to fetch team players', loading: false });
        }
    },

    clearCache: () => {
        playersByTeamCache.clear();
        clientLogger.info('PlayersStore', 'Cache cleared');
        set({ error: null });
    },
}));

if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
        cleanupInterval();
    });
}