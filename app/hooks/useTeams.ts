import useSWR, { mutate as globalMutate, type BareFetcher } from 'swr';
import {
    getAllTeamsWithRegionsAction,
    getTeamsByIdsAction,
    getTeamWithPlayersAction,
} from '@/app/actions/team.actions';
import { TeamWithRegion } from '@/server/domains/team';
import { PlayerWithRole } from '@/server/domains/player';
import { useRegionByCode } from './useRegions';
import { useSeasonBySlugAndRegion } from './useSeasons';

const TEAMS_LIST_TTL = 5 * 60 * 1000;
const TEAM_DETAILS_TTL = 5 * 60 * 1000;

async function fetchAllTeams(): Promise<TeamWithRegion[]> {
    const result = await getAllTeamsWithRegionsAction();
    if (!result.ok) throw new Error(result.error.message);
    return result.value;
}

async function fetchTeamWithPlayers(
    [, slug, seasonId]: [string, string, string]
): Promise<{ team: TeamWithRegion; players: PlayerWithRole[] }> {
    const result = await getTeamWithPlayersAction({ slug, seasonId });
    if (!result.ok) throw new Error(result.error.message);
    return result.value;
}

async function fetchTeamsByIds(
    [, ...ids]: [string, ...string[]]
): Promise<TeamWithRegion[]> {
    if (ids.length === 0) return [];
    const result = await getTeamsByIdsAction(ids);
    if (!result.ok) throw new Error(result.error.message);
    return result.value;
}

export function useTeams() {
    const { data, error, isLoading, mutate } = useSWR('teams', fetchAllTeams, {
        dedupingInterval: TEAMS_LIST_TTL,
        revalidateOnFocus: false,
    });

    return {
        teams: data ?? [],
        isLoading,
        error: error?.message ?? null,
        mutate,
    };
}

/**
 * Fetch team with players. Resolves region + season from slugs.
 */
export function useTeamWithPlayers(
    teamSlug: string | null,
    seasonSlug: string | null,
    regionCode: string | null,
) {
    const { region } = useRegionByCode(regionCode);
    const { season } = useSeasonBySlugAndRegion(seasonSlug, region?.id ?? null);

    const key = teamSlug && season
        ? ['teamWithPlayers', teamSlug, season.id] as const
        : null;

    const { data, error, isLoading, mutate } = useSWR(
        key,
        fetchTeamWithPlayers as BareFetcher<{ team: TeamWithRegion; players: PlayerWithRole[] }>,
        {
            dedupingInterval: TEAM_DETAILS_TTL,
            revalidateOnFocus: false,
        }
    );

    return {
        team: (data as { team: TeamWithRegion; players: PlayerWithRole[] } | undefined)?.team ?? null,
        players: (data as { team: TeamWithRegion; players: PlayerWithRole[] } | undefined)?.players ?? [],
        isLoading,
        error: error?.message ?? null,
        mutate,
    };
}

export function useTeamsByIds(teamIds: string[]) {
    const sortedIds = [...teamIds].sort();
    const key = sortedIds.length > 0
        ? ['teamsByIds', ...sortedIds] as const
        : null;

    const { data, error, isLoading, mutate } = useSWR(
        key,
        fetchTeamsByIds as BareFetcher<TeamWithRegion[]>,
        {
            dedupingInterval: TEAM_DETAILS_TTL,
            revalidateOnFocus: false,
        }
    );

    return {
        teams: (data as TeamWithRegion[] | undefined) ?? [],
        isLoading,
        error: error?.message ?? null,
        mutate,
    };
}

// Cache mutation helpers
export function mutateAllTeams() {
    return globalMutate('teams');
}

export function mutateTeamWithPlayers(slug: string, seasonId: string) {
    return globalMutate(['teamWithPlayers', slug, seasonId]);
}
