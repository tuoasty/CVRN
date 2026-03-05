import { create } from 'zustand';
import { Player } from '@/shared/types/db';
import { getTeamPlayersAction, getPlayersByIdsAction } from '@/app/actions/player.actions';
import { CacheEntry, createCacheEntry, isCacheValid, setupAutoEviction } from './storeUtils';
import { clientLogger } from "@/app/utils/clientLogger";
import {PlayerWithRole} from "@/server/dto/player.dto";

type PlayersState = {
    playersByTeamCache: Map<string, CacheEntry<PlayerWithRole[]>>;
    playersByIdsCache: Map<string, CacheEntry<Player>>;
    loading: boolean;
    error: string | null;

    fetchTeamPlayers: (teamId: string, seasonId: string) => Promise<void>;
    fetchPlayersByIds: (playerIds: string[]) => Promise<Player[]>;
    getSortedTeamPlayers: (teamId: string, seasonId: string) => {
        captain: PlayerWithRole | null;
        viceCaptain: PlayerWithRole | null;
        courtCaptain: PlayerWithRole | null;
        players: PlayerWithRole[];
    };
    clearCache: () => void;
};

const TEAM_PLAYERS_TTL = 2 * 60 * 1000;
const PLAYER_TTL = 5 * 60 * 1000;

const playersByTeamCache = new Map<string, CacheEntry<PlayerWithRole[]>>();
const playersByIdsCache = new Map<string, CacheEntry<Player>>();

const teamCleanupInterval = setupAutoEviction(playersByTeamCache, 60000);
const playerCleanupInterval = setupAutoEviction(playersByIdsCache, 60000);

export const usePlayerStore = create<PlayersState>((set, get) => ({
    playersByTeamCache,
    playersByIdsCache,
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

    fetchPlayersByIds: async (playerIds: string[]) => {
        const { playersByIdsCache } = get();

        const uncachedIds = playerIds.filter(id => {
            const cached = playersByIdsCache.get(id);
            return !isCacheValid(cached);
        });

        const cachedPlayers = playerIds
            .map(id => playersByIdsCache.get(id)?.data)
            .filter((p): p is Player => p !== undefined);

        if (uncachedIds.length === 0) {
            clientLogger.info('PlayersStore', 'Using cached players', { count: cachedPlayers.length });
            return cachedPlayers;
        }

        clientLogger.info('PlayersStore', 'Fetching players by IDs', {
            total: playerIds.length,
            uncached: uncachedIds.length
        });

        try {
            const result = await getPlayersByIdsAction({ playerIds: uncachedIds });

            if (!result.ok) {
                clientLogger.error('PlayersStore', 'Failed to fetch players by IDs', {
                    playerIds: uncachedIds,
                    error: result.error
                });
                return cachedPlayers;
            }

            result.value.forEach(player => {
                playersByIdsCache.set(player.id, createCacheEntry(player, PLAYER_TTL));
            });

            clientLogger.info('PlayersStore', 'Players fetched successfully', {
                count: result.value.length
            });

            set({ playersByIdsCache });

            return [...cachedPlayers, ...result.value];
        } catch (error) {
            clientLogger.error('PlayersStore', 'Exception fetching players by IDs', {
                playerIds: uncachedIds,
                error
            });
            return cachedPlayers;
        }
    },

    getSortedTeamPlayers: (teamId: string, seasonId: string) => {
        const cacheKey = `${teamId}-${seasonId}`;
        const { playersByTeamCache } = get();
        const cached = playersByTeamCache.get(cacheKey);

        if (!cached) {
            return {
                captain: null,
                viceCaptain: null,
                courtCaptain: null,
                players: []
            };
        }

        const allPlayers = cached.data;

        const captain = allPlayers.find(p => p.role === 'captain') || null;
        const viceCaptain = allPlayers.find(p => p.role === 'vice_captain') || null;
        const courtCaptain = allPlayers.find(p => p.role === 'court_captain') || null;
        const players = allPlayers.filter(p => p.role === 'player');

        return {
            captain,
            viceCaptain,
            courtCaptain,
            players
        };
    },

    clearCache: () => {
        playersByTeamCache.clear();
        playersByIdsCache.clear();
        clientLogger.info('PlayersStore', 'Cache cleared');
        set({ error: null });
    },
}));

if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
        teamCleanupInterval();
        playerCleanupInterval();
    });
}