import useSWR, { mutate as globalMutate } from 'swr';
import {
    getAllTeamsWithRegionsAction,
    getTeamBySlugAndSeasonAction,
    getTeamsByIdsAction,
    getTeamWithPlayersAction,
} from '@/app/actions/team.actions';
import { TeamWithRegion } from '@/server/dto/team.dto';
import { PlayerWithRole } from '@/server/dto/player.dto';
import { useRegionByCode } from './useRegions';
import { useSeasonBySlugAndRegion } from './useSeasons';

const TEAMS_LIST_TTL = 5 * 60 * 1000;
const TEAM_DETAILS_TTL = 5 * 60 * 1000;

async function fetchAllTeams(): Promise<TeamWithRegion[]> {
    const result = await getAllTeamsWithRegionsAction();
    if (!result.ok) throw new Error(result.error.message);
    return result.value;
}

async function fetchTeamBySlugAndSeason(
    [, slug, seasonId]: [string, string, string]
): Promise<TeamWithRegion> {
    const result = await getTeamBySlugAndSeasonAction({ slug, seasonId });
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
 * Fetch a single team by slug + season.
 * Requires resolving regionCode → regionId → seasonId first.
 */
export function useTeam(teamSlug: string | null, seasonSlug: string | null, regionCode: string | null) {
    const { region } = useRegionByCode(regionCode);
    const { season } = useSeasonBySlugAndRegion(seasonSlug, region?.id ?? null);

    const key = teamSlug && season
        ? ['team', teamSlug, season.id] as const
        : null;

    const { data, error, isLoading, mutate } = useSWR(
        key,
        fetchTeamBySlugAndSeason as any,
        {
            dedupingInterval: TEAM_DETAILS_TTL,
            revalidateOnFocus: false,
        }
    );

    return {
        team: (data as TeamWithRegion | undefined) ?? null,
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
        fetchTeamWithPlayers as any,
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
        fetchTeamsByIds as any,
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

export function mutateTeam(slug: string, seasonId: string) {
    return globalMutate(['team', slug, seasonId]);
}

export function mutateTeamWithPlayers(slug: string, seasonId: string) {
    return globalMutate(['teamWithPlayers', slug, seasonId]);
}
