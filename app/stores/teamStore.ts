import { create } from 'zustand';
import { TeamWithRegion } from '@/server/dto/team.dto';
import {
    getAllTeamsWithRegionsAction, getTeamBySlugAndSeasonAction,
} from '@/app/actions/team.actions';
import {CacheEntry, createCacheEntry, isCacheValid, setupAutoEviction} from './storeUtils';
import {clientLogger} from "@/app/utils/clientLogger";
import { useRegionsStore } from './regionStore';
import { useSeasonsStore } from './seasonStore';

type TeamsState = {
    allTeamsCache: CacheEntry<TeamWithRegion[]> | undefined;
    teamDetailsCache: Map<string, CacheEntry<TeamWithRegion>>;
    loading: boolean;
    error: string | null;

    fetchAllTeams: () => Promise<void>;
    fetchTeamDetails: (teamSlug: string, seasonSlug: string, regionCode: string) => Promise<void>;
    addTeamToCache: (team: TeamWithRegion) => void;
    removeTeamFromCache: (teamId: string) => void;
    clearCache: () => void;
};

const TEAMS_LIST_TTL = 5 * 60 * 1000;
const TEAM_DETAILS_TTL = 5 * 60 * 1000;

const teamDetailsCache = new Map<string, CacheEntry<TeamWithRegion>>();

const cleanupInterval = setupAutoEviction(teamDetailsCache, 60000);

const createTeamCacheKey = (teamSlug: string, seasonSlug: string) => `${teamSlug}-${seasonSlug}`;

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

    fetchTeamDetails: async (teamSlug: string, seasonSlug: string, regionCode: string) => {
        const { teamDetailsCache } = get();
        const cacheKey = createTeamCacheKey(teamSlug, seasonSlug);
        const cached = teamDetailsCache.get(cacheKey);

        if (isCacheValid(cached)) {
            clientLogger.info('TeamsStore', 'Using cached team details', { teamSlug, seasonSlug });
            return;
        }

        clientLogger.info('TeamsStore', 'Fetching team details', { teamSlug, seasonSlug, regionCode });
        set({ loading: true, error: null });

        try {
            const regionsStore = useRegionsStore.getState();
            await regionsStore.fetchRegionByCode(regionCode);

            const region = regionsStore.regionByCodeCache.get(regionCode.toLowerCase())?.data;

            if (!region) {
                clientLogger.error('TeamsStore', 'Region not found', { regionCode });
                set({ error: 'Region not found', loading: false });
                return;
            }

            const seasonsStore = useSeasonsStore.getState();
            await seasonsStore.fetchSeasonBySlugAndRegion(seasonSlug, region.id);

            const season = seasonsStore.seasonBySlugCache.get(`${seasonSlug}-${region.id}`)?.data;

            if (!season) {
                clientLogger.error('TeamsStore', 'Season not found', { seasonSlug, regionId: region.id });
                set({ error: 'Season not found', loading: false });
                return;
            }

            const result = await getTeamBySlugAndSeasonAction({
                slug: teamSlug,
                seasonId: season.id
            });

            if (!result.ok) {
                clientLogger.error('TeamsStore', 'Failed to fetch team details', { teamSlug, seasonSlug, error: result.error });
                set({ error: result.error.message, loading: false });
                return;
            }

            teamDetailsCache.set(cacheKey, createCacheEntry(result.value, TEAM_DETAILS_TTL));
            clientLogger.info('TeamsStore', 'Team details fetched successfully', { teamSlug, seasonSlug });
            set({ teamDetailsCache, loading: false });
        } catch (error) {
            clientLogger.error('TeamsStore', 'Exception fetching team details', { teamSlug, seasonSlug, error });
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