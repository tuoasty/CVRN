import useSWR from 'swr';
import {getTeamNameHistoryAction} from '@/app/actions/team.actions';
import {TeamNameHistoryEntry} from '@/server/domains/team';

async function fetchTeamNameHistory([, teamId]: [string, string]): Promise<TeamNameHistoryEntry[]> {
    const result = await getTeamNameHistoryAction(teamId);
    if (!result.ok) throw new Error(result.error.message);
    return result.value;
}

export function useTeamNameHistory(teamId: string | null) {
    const {data, error, isLoading} = useSWR(
        teamId ? ['teamNameHistory', teamId] : null,
        fetchTeamNameHistory,
        {dedupingInterval: 5 * 60 * 1000, revalidateOnFocus: false}
    );

    return {
        history: data ?? [],
        isLoading,
        error: error?.message ?? null,
    };
}
