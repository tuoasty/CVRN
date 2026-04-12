import useSWR, { mutate as globalMutate, type BareFetcher } from 'swr';
import { PlayoffBracket } from '@/shared/types/db';
import {
    generatePlayoffBracketAction,
    getPlayoffBracketBySeasonIdAction,
    resetPlayoffBracketsAction,
} from '@/app/actions/playoff.actions';
import { GeneratePlayoffBracketInput } from '@/server/dto/playoff.dto';

const BRACKETS_TTL = 5 * 60 * 1000;

async function fetchBrackets([, seasonId]: [string, string]): Promise<PlayoffBracket[]> {
    const result = await getPlayoffBracketBySeasonIdAction(seasonId);
    if (!result.ok) throw new Error(result.error.message);
    return result.value;
}

export function usePlayoffBrackets(seasonId: string | null) {
    const key = seasonId ? ['brackets', seasonId] as const : null;

    const { data, error, isLoading, mutate } = useSWR(
        key,
        fetchBrackets as BareFetcher<PlayoffBracket[]>,
        {
            dedupingInterval: BRACKETS_TTL,
            revalidateOnFocus: false,
        }
    );

    return {
        brackets: (data as PlayoffBracket[] | undefined) ?? [],
        isLoading,
        error: error?.message ?? null,
        mutate,
    };
}

// Mutation actions

export async function generateBracket(input: GeneratePlayoffBracketInput): Promise<boolean> {
    const result = await generatePlayoffBracketAction(input);
    if (!result.ok) throw new Error(result.error.message);
    await globalMutate(['brackets', input.seasonId]);
    return true;
}

export async function resetBrackets(seasonId: string): Promise<boolean> {
    const result = await resetPlayoffBracketsAction(seasonId);
    if (!result.ok) throw new Error(result.error.message);
    await globalMutate(['brackets', seasonId]);
    return true;
}
