import { create } from 'zustand';
import { TeamWithRegion, TeamWithRegionAndPlayers } from '@/server/dto/team.dto';
import { getAllTeamsWithRegionsAction, getTeamWithRegionAndPlayersAction } from '@/app/actions/team.actions';
import {CacheEntry, createCacheEntry, isCacheValid, setupAutoEviction} from './storeUtils';
import {clientLogger} from "@/app/utils/clientLogger";

type TeamsState = {
    allTeamsCache: CacheEntry<TeamWithRegion[]> | undefined;
    teamDetailsCache: Map<string, CacheEntry<TeamWithRegionAndPlayers>>;
    loading: boolean;
    error: string | null;

    fetchAllTeams: () => Promise<void>;
    fetchTeamDetails: (slug: string, regionCode: string) => Promise<void>;
    addTeamToCache: (team: TeamWithRegion) => void;
    removeTeamFromCache: (teamId: string) => void;
    clearCache: () => void;
};

const TEAMS_LIST_TTL = 5 * 60 * 1000;
const TEAM_DETAILS_TTL = 5 * 60 * 1000;

const teamDetailsCache = new Map<string, CacheEntry<TeamWithRegionAndPlayers>>();

const cleanupInterval = setupAutoEviction(teamDetailsCache, 60000);

const createTeamCacheKey = (slug: string, regionCode: string) => `${slug}-${regionCode}`;

export const useTeamsStore = create<TeamsState>((set, get) => ({
    allTeamsCache: undefined,
    teamDetailsCache,
    loading: false,
    error: null,

    fetchAllTeams: async () => {
        const { allTeamsCache } = get();

        if (isCacheValid(allTeamsCache)) {
            clientLogger.info('TeamsStore', 'Using cached teams list', { count: allTeamsCache?.data.length });
            return;
        }

        if (isCacheValid(allTeamsCache)) {
            return;
        }
        clientLogger.info('TeamsStore', 'Fetching teams from server');
        set({ loading: true, error: null });

        try {
            const result = await getAllTeamsWithRegionsAction();

            if (!result.ok) {
                clientLogger.error('TeamsStore', 'Failed to fetch teams', { error: result.error });
                set({ error: result.error.message, loading: false });
                return;
            }
            clientLogger.info('TeamsStore', 'Teams fetched successfully', { count: result.value.length });
            set({
                allTeamsCache: createCacheEntry(result.value, TEAMS_LIST_TTL),
                loading: false,
            });
        } catch (error) {
            clientLogger.error('TeamsStore', 'Exception during fetch', { error });
            set({ error: 'Failed to fetch teams', loading: false });
        }
    },

    fetchTeamDetails: async (slug: string, regionCode: string) => {
        const { teamDetailsCache } = get();
        const cacheKey = createTeamCacheKey(slug, regionCode);
        const cached = teamDetailsCache.get(cacheKey);

        if (isCacheValid(cached)) {
            clientLogger.info('TeamsStore', 'Using cached team details', { slug, regionCode });
            return;
        }

        clientLogger.info('TeamsStore', 'Fetching team details', { slug, regionCode });
        set({ loading: true, error: null });

        try {
            const result = await getTeamWithRegionAndPlayersAction({ slug, regionCode });

            if (!result.ok) {
                clientLogger.error('TeamsStore', 'Failed to fetch team details', { slug, regionCode, error: result.error });
                set({ error: result.error.message, loading: false });
                return;
            }

            teamDetailsCache.set(cacheKey, createCacheEntry(result.value, TEAM_DETAILS_TTL));
            clientLogger.info('TeamsStore', 'Team details fetched successfully', { slug, regionCode });
            set({ teamDetailsCache, loading: false });
        } catch (error) {
            clientLogger.error('TeamsStore', 'Exception fetching team details', { slug, regionCode, error });
            set({ error: 'Failed to fetch team details', loading: false });
        }
    },

    addTeamToCache: (team: TeamWithRegion) => {
        const { allTeamsCache } = get();

        if (!allTeamsCache){
            clientLogger.warn('TeamsStore', 'Cannot add team - cache not initialized');
            return
        }

        clientLogger.info('TeamsStore', 'Adding team to cache', { teamId: team.id, teamName: team.name });
        const updatedTeams = [...allTeamsCache.data, team];

        set({
            allTeamsCache: createCacheEntry(updatedTeams, TEAMS_LIST_TTL),
        });
    },

    removeTeamFromCache: (teamId: string) => {
        const { allTeamsCache } = get();

        if (!allTeamsCache) {
            clientLogger.warn('TeamsStore', 'Cannot remove team - cache not initialized');
            return;
        }

        clientLogger.info('TeamsStore', 'Removing team from cache', { teamId });
        const updatedTeams = allTeamsCache.data.filter(t => t.id !== teamId);

        set({
            allTeamsCache: createCacheEntry(updatedTeams, TEAMS_LIST_TTL),
        });
    },

    clearCache: () => {
        teamDetailsCache.clear();
        set({ allTeamsCache: undefined, error: null });
    },
}));

if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
        cleanupInterval();
    });
}