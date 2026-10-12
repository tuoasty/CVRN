import useSWR, { mutate as globalMutate, type BareFetcher } from 'swr';
import { Match, Team } from '@/shared/types/db';
import {
    completeMatchAction,
    deleteMatchAction,
    getAllMatchesAction,
    getAvailablePlayoffRoundsAction,
    getCompletedPlayoffRoundsAction,
    getAvailableTeamsForWeekAction,
    getDefaultWeekForSeasonAction,
    getPlayoffRoundCountsAction,
    getWeekMatchCountsAction,
    getMatchesForWeekAction,

    getPlayoffScheduleAction,
    getRecentMatchesAction,
    getUpcomingMatchesAction,
    getWeekScheduleAction,
    updateMatchResultsAction,
    updateMatchScheduleAction,
    voidMatchAction,
} from '@/app/actions/match.actions';
import { CompleteMatchInput, MatchWithDetails, UpdateMatchScheduleInput, VoidMatchInput } from '@/server/domains/match';
import { PlayoffRound } from '@/server/domains/playoff';
import { Ok, Result } from '@/shared/types/result';
import { SerializableError } from '@/server/utils/serializeableError';

const MATCHES_TTL = 2 * 60 * 1000;
const AVAILABLE_TEAMS_TTL = 60 * 1000;

async function fetchAllMatches(): Promise<Match[]> {
    const result = await getAllMatchesAction();
    if (!result.ok) throw new Error(result.error.message);
    return result.value;
}

async function fetchAvailableTeams([, seasonId, week]: [string, string, number]): Promise<Team[]> {
    const result = await getAvailableTeamsForWeekAction({ seasonId, week });
    if (!result.ok) throw new Error(result.error.message);
    return result.value;
}

async function fetchMatchesForWeek([, seasonId, week]: [string, string, number]): Promise<Match[]> {
    const result = await getMatchesForWeekAction({ seasonId, week });
    if (!result.ok) throw new Error(result.error.message);
    return result.value;
}

async function fetchWeekSchedule([, seasonId, week]: [string, string, number]): Promise<MatchWithDetails[]> {
    const result = await getWeekScheduleAction({ seasonId, week });
    if (!result.ok) throw new Error(result.error.message);
    return result.value;
}

async function fetchPlayoffSchedule([, seasonId, round]: [string, string, PlayoffRound]): Promise<MatchWithDetails[]> {
    const result = await getPlayoffScheduleAction({ seasonId, round });
    if (!result.ok) throw new Error(result.error.message);
    return result.value;
}

async function fetchAvailablePlayoffRounds([, seasonId]: [string, string]): Promise<string[]> {
    const result = await getAvailablePlayoffRoundsAction(seasonId);
    if (!result.ok) throw new Error(result.error.message);
    return result.value;
}

async function fetchCompletedPlayoffRounds([, seasonId]: [string, string]): Promise<string[]> {
    const result = await getCompletedPlayoffRoundsAction(seasonId);
    if (!result.ok) throw new Error(result.error.message);
    return result.value;
}

async function fetchUpcomingMatches([, seasonId, limit]: [string, string, number]): Promise<MatchWithDetails[]> {
    const result = await getUpcomingMatchesAction(seasonId, limit);
    if (!result.ok) throw new Error(result.error.message);
    return result.value;
}

async function fetchRecentMatches([, seasonId, limit]: [string, string, number]): Promise<MatchWithDetails[]> {
    const result = await getRecentMatchesAction(seasonId, limit);
    if (!result.ok) throw new Error(result.error.message);
    return result.value;
}

async function fetchDefaultWeekForSeason([, seasonId]: [string, string]): Promise<number> {
    const result = await getDefaultWeekForSeasonAction(seasonId);
    if (!result.ok) throw new Error(result.error.message);
    return result.value;
}

async function fetchPlayoffRoundCounts([, seasonId]: [string, string]): Promise<{ round: string; count: number }[]> {
    const result = await getPlayoffRoundCountsAction(seasonId);
    if (!result.ok) throw new Error(result.error.message);
    return result.value;
}

async function fetchWeekMatchCounts([, seasonId]: [string, string]): Promise<{ week: number; total: number; completed: number }[]> {
    const result = await getWeekMatchCountsAction(seasonId);
    if (!result.ok) throw new Error(result.error.message);
    return result.value;
}

export function useAllMatches() {
    const { data, error, isLoading, mutate } = useSWR('matches', fetchAllMatches, {
        dedupingInterval: MATCHES_TTL,
        revalidateOnFocus: false,
    });
    return { matches: data ?? [], isLoading, error: error?.message ?? null, mutate };
}

export function useAvailableTeams(seasonId: string | null, week: number | null) {
    const key = seasonId && week != null ? ['availableTeams', seasonId, week] as const : null;
    const { data, error, isLoading, mutate } = useSWR(key, fetchAvailableTeams as BareFetcher<Team[]>, {
        dedupingInterval: AVAILABLE_TEAMS_TTL,
        revalidateOnFocus: false,
    });
    return { teams: (data as Team[] | undefined) ?? [], isLoading, error: error?.message ?? null, mutate };
}

export function useMatchesForWeek(seasonId: string | null, week: number | null) {
    const key = seasonId && week != null ? ['matchesForWeek', seasonId, week] as const : null;
    const { data, error, isLoading, mutate } = useSWR(key, fetchMatchesForWeek as BareFetcher<Match[]>, {
        dedupingInterval: MATCHES_TTL,
        revalidateOnFocus: false,
    });
    return { matches: (data as Match[] | undefined) ?? [], isLoading, error: error?.message ?? null, mutate };
}

export function useWeekSchedule(seasonId: string | null, week: number | null) {
    const key = seasonId && week != null ? ['weekSchedule', seasonId, week] as const : null;
    const { data, error, isLoading, mutate } = useSWR(key, fetchWeekSchedule as BareFetcher<MatchWithDetails[]>, {
        dedupingInterval: MATCHES_TTL,
        revalidateOnFocus: false,
    });
    return { schedule: (data as MatchWithDetails[] | undefined) ?? [], isLoading, error: error?.message ?? null, mutate };
}

export function usePlayoffSchedule(seasonId: string | null, round: PlayoffRound | null) {
    const key = seasonId && round ? ['playoffSchedule', seasonId, round] as const : null;
    const { data, error, isLoading, mutate } = useSWR(key, fetchPlayoffSchedule as BareFetcher<MatchWithDetails[]>, {
        dedupingInterval: MATCHES_TTL,
        revalidateOnFocus: false,
    });
    return { schedule: (data as MatchWithDetails[] | undefined) ?? [], isLoading, error: error?.message ?? null, mutate };
}

export function useAvailablePlayoffRounds(seasonId: string | null) {
    const key = seasonId ? ['playoffRounds', seasonId] as const : null;
    const { data, error, isLoading, mutate } = useSWR(key, fetchAvailablePlayoffRounds as BareFetcher<string[]>, {
        dedupingInterval: MATCHES_TTL,
        revalidateOnFocus: false,
    });
    return { rounds: (data as string[] | undefined) ?? [], isLoading, error: error?.message ?? null, mutate };
}

export function useCompletedPlayoffRounds(seasonId: string | null) {
    const key = seasonId ? ['completedPlayoffRounds', seasonId] as const : null;
    const { data, error, isLoading, mutate } = useSWR(key, fetchCompletedPlayoffRounds as BareFetcher<string[]>, {
        dedupingInterval: MATCHES_TTL,
        revalidateOnFocus: false,
    });
    return { rounds: (data as string[] | undefined) ?? [], isLoading, error: error?.message ?? null, mutate };
}

export function useUpcomingMatches(seasonId: string | null, limit: number = 5) {
    const key = seasonId ? ['upcoming', seasonId, limit] as const : null;
    const { data, error, isLoading, mutate } = useSWR(key, fetchUpcomingMatches as BareFetcher<MatchWithDetails[]>, {
        dedupingInterval: MATCHES_TTL,
        revalidateOnFocus: false,
    });
    return { matches: (data as MatchWithDetails[] | undefined) ?? [], isLoading, error: error?.message ?? null, mutate };
}

export function useRecentMatches(seasonId: string | null, limit: number = 5) {
    const key = seasonId ? ['recent', seasonId, limit] as const : null;
    const { data, error, isLoading, mutate } = useSWR(key, fetchRecentMatches as BareFetcher<MatchWithDetails[]>, {
        dedupingInterval: MATCHES_TTL,
        revalidateOnFocus: false,
    });
    return { matches: (data as MatchWithDetails[] | undefined) ?? [], isLoading, error: error?.message ?? null, mutate };
}

export function useDefaultWeekForSeason(seasonId: string | null) {
    const key = seasonId ? ['defaultWeek', seasonId] as const : null;
    const { data, error, isLoading } = useSWR(
        key,
        fetchDefaultWeekForSeason as BareFetcher<number>,
        { dedupingInterval: MATCHES_TTL, revalidateOnFocus: false }
    );
    return { defaultWeek: (data as number | undefined) ?? null, isLoading, error: error?.message ?? null };
}

export function usePlayoffRoundCounts(seasonId: string | null) {
    const key = seasonId ? ['playoffRoundCounts', seasonId] as const : null;
    const { data, error, isLoading } = useSWR(
        key,
        fetchPlayoffRoundCounts as BareFetcher<{ round: string; count: number }[]>,
        { dedupingInterval: MATCHES_TTL, revalidateOnFocus: false }
    );
    return {
        roundCounts: data ?? [],
        isLoading,
        error: error?.message ?? null,
    };
}

export function useWeekMatchCounts(seasonId: string | null) {
    const key = seasonId ? ['weekMatchCounts', seasonId] as const : null;
    const { data, error, isLoading } = useSWR(
        key,
        fetchWeekMatchCounts as BareFetcher<{ week: number; total: number; completed: number }[]>,
        { dedupingInterval: MATCHES_TTL, revalidateOnFocus: false }
    );
    return {
        weekCounts: data ?? [],
        isLoading,
        error: error?.message ?? null,
    };
}

export async function updateMatchSchedule(input: UpdateMatchScheduleInput): Promise<Result<true, SerializableError>> {
    const result = await updateMatchScheduleAction(input);
    if (!result.ok) return result;
    await Promise.all([
        globalMutate('matches'),
        globalMutate((key: unknown) => Array.isArray(key) && (key[0] === 'matchesForWeek' || key[0] === 'weekSchedule' || key[0] === 'playoffSchedule')),
    ]);
    return Ok(true);
}

export async function completeMatch(input: CompleteMatchInput): Promise<Result<true, SerializableError>> {
    const result = await completeMatchAction(input);
    if (!result.ok) return result;
    await Promise.all([
        globalMutate('matches'),
        globalMutate((key: unknown) => Array.isArray(key) && (key[0] === 'matchesForWeek' || key[0] === 'weekSchedule' || key[0] === 'playoffSchedule' || key[0] === 'upcoming' || key[0] === 'recent')),
    ]);
    return Ok(true);
}

export async function voidMatch(input: VoidMatchInput): Promise<Result<true, SerializableError>> {
    const result = await voidMatchAction(input);
    if (!result.ok) return result;
    await Promise.all([
        globalMutate('matches'),
        globalMutate((key: unknown) => Array.isArray(key) && (key[0] === 'matchesForWeek' || key[0] === 'weekSchedule' || key[0] === 'playoffSchedule')),
    ]);
    return Ok(true);
}

export async function updateMatchResults(input: CompleteMatchInput): Promise<Result<true, SerializableError>> {
    const result = await updateMatchResultsAction(input);
    if (!result.ok) return result;
    await Promise.all([
        globalMutate('matches'),
        globalMutate((key: unknown) => Array.isArray(key) && (key[0] === 'matchesForWeek' || key[0] === 'weekSchedule' || key[0] === 'playoffSchedule' || key[0] === 'matchSets')),
    ]);
    return Ok(true);
}

export async function deleteMatch(matchId: string): Promise<Result<true, SerializableError>> {
    const result = await deleteMatchAction(matchId);
    if (!result.ok) return result;
    await Promise.all([
        globalMutate('matches'),
        globalMutate((key: unknown) => Array.isArray(key) && (key[0] === 'matchesForWeek' || key[0] === 'weekSchedule' || key[0] === 'availableTeams')),
    ]);
    return Ok(true);
}

export function invalidateMatchCaches() {
    globalMutate('matches');
    globalMutate((key: unknown) => Array.isArray(key) && ['matchesForWeek', 'weekSchedule', 'playoffSchedule', 'availableTeams', 'upcoming', 'recent', 'matchSets', 'playoffRounds', 'playoffRoundCounts'].includes(key[0]));
}
