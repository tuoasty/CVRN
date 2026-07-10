import useSWR, { mutate as globalMutate, type BareFetcher } from 'swr';
import { useMemo } from 'react';
import { PlayoffBracket, PlayoffConfig } from '@/shared/types/db';
import {
    generatePlayoffBracketAction,
    getPlayoffBracketBySeasonIdAction,
    getAllPlayoffConfigsAction,
    resetPlayoffBracketsAction,
} from '@/app/actions/playoff.actions';
import { GeneratePlayoffBracketInput, Incoming } from '@/server/domains/playoff';
import { Ok, Result } from '@/shared/types/result';
import { SerializableError } from '@/server/utils/serializeableError';

const BRACKETS_TTL = 5 * 60 * 1000;

async function fetchBrackets([, seasonId]: [string, string]): Promise<PlayoffBracket[]> {
    const result = await getPlayoffBracketBySeasonIdAction(seasonId);
    if (!result.ok) throw new Error(result.error.message);
    return result.value;
}

function buildIncomingMap(brackets: PlayoffBracket[]): Map<string, Incoming> {
    const map = new Map<string, Incoming>();
    for (const bracket of brackets) {
        if (bracket.next_bracket_id && (bracket.winner_position === "home" || bracket.winner_position === "away")) {
            const target = map.get(bracket.next_bracket_id) ?? {};
            target[bracket.winner_position] = { type: "Winner", source: bracket.match_id };
            map.set(bracket.next_bracket_id, target);
        }
        if (bracket.loser_next_bracket_id && (bracket.loser_position === "home" || bracket.loser_position === "away")) {
            const target = map.get(bracket.loser_next_bracket_id) ?? {};
            target[bracket.loser_position] = { type: "Loser", source: bracket.match_id };
            map.set(bracket.loser_next_bracket_id, target);
        }
    }
    return map;
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

    const brackets = (data as PlayoffBracket[] | undefined) ?? [];
    const incomingMap = useMemo(() => buildIncomingMap(brackets), [data]);

    return {
        brackets,
        incomingMap,
        isLoading,
        error: error?.message ?? null,
        mutate,
    };
}

async function fetchConfigs(): Promise<PlayoffConfig[]> {
    const result = await getAllPlayoffConfigsAction();
    if (!result.ok) throw new Error(result.error.message);
    return result.value;
}

export function usePlayoffConfigs() {
    const { data, error, isLoading } = useSWR('playoff-configs', fetchConfigs, {
        dedupingInterval: BRACKETS_TTL,
        revalidateOnFocus: false,
    });

    return {
        configs: (data as PlayoffConfig[] | undefined) ?? [],
        isLoading,
        error: error?.message ?? null,
    };
}

// Mutation actions

export async function generateBracket(input: GeneratePlayoffBracketInput): Promise<Result<true, SerializableError>> {
    const result = await generatePlayoffBracketAction(input);
    if (!result.ok) return result;
    await globalMutate(['brackets', input.seasonId]);
    return Ok(true);
}

export async function resetBrackets(seasonId: string): Promise<Result<true, SerializableError>> {
    const result = await resetPlayoffBracketsAction(seasonId);
    if (!result.ok) return result;
    await globalMutate(['brackets', seasonId]);
    return Ok(true);
}
