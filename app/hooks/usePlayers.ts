import useSWR, { mutate as globalMutate, type BareFetcher } from 'swr';
import { getTeamPlayersAction, getPlayersByIdsAction } from '@/app/actions/player.actions';
import { Player } from '@/shared/types/db';
import { PlayerWithRole } from '@/server/dto/player.dto';

const TEAM_PLAYERS_TTL = 2 * 60 * 1000;
const PLAYER_TTL = 5 * 60 * 1000;

async function fetchTeamPlayers(
    [, teamId, seasonId]: [string, string, string]
): Promise<PlayerWithRole[]> {
    const result = await getTeamPlayersAction({ teamId, seasonId });
    if (!result.ok) throw new Error(result.error.message);
    return result.value;
}

async function fetchPlayersByIds(
    [, ...playerIds]: [string, ...string[]]
): Promise<Player[]> {
    if (playerIds.length === 0) return [];
    const result = await getPlayersByIdsAction({ playerIds });
    if (!result.ok) throw new Error(result.error.message);
    return result.value;
}

export function useTeamPlayers(teamId: string | null, seasonId: string | null) {
    const key = teamId && seasonId
        ? ['players', teamId, seasonId] as const
        : null;

    const { data, error, isLoading, mutate } = useSWR(
        key,
        fetchTeamPlayers as BareFetcher<PlayerWithRole[]>,
        {
            dedupingInterval: TEAM_PLAYERS_TTL,
            revalidateOnFocus: false,
        }
    );

    const players = (data as PlayerWithRole[] | undefined) ?? [];

    const captain = players.find(p => p.role === 'captain') ?? null;
    const viceCaptain = players.find(p => p.role === 'vice_captain') ?? null;
    const courtCaptain = players.find(p => p.role === 'court_captain') ?? null;
    const regularPlayers = players.filter(p => p.role === 'player');

    return {
        players,
        captain,
        viceCaptain,
        courtCaptain,
        regularPlayers,
        isLoading,
        error: error?.message ?? null,
        mutate,
    };
}

export function usePlayersByIds(playerIds: string[]) {
    const sortedIds = [...playerIds].sort();
    const key = sortedIds.length > 0
        ? ['playersByIds', ...sortedIds] as const
        : null;

    const { data, error, isLoading } = useSWR(
        key,
        fetchPlayersByIds as BareFetcher<Player[]>,
        {
            dedupingInterval: PLAYER_TTL,
            revalidateOnFocus: false,
        }
    );

    return {
        players: (data as Player[] | undefined) ?? [],
        isLoading,
        error: error?.message ?? null,
    };
}

// Cache mutation helpers
export function mutateTeamPlayers(teamId: string, seasonId: string) {
    return globalMutate(['players', teamId, seasonId]);
}
