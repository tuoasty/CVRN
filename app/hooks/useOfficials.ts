import useSWR, { mutate as globalMutate, type BareFetcher } from 'swr';
import { Official } from '@/shared/types/db';
import { RobloxUserWithAvatar } from '@/shared/types/roblox';
import {
    searchOfficialsByNameAction,
    saveOfficialAction,
    getAllOfficialsAction,
    getMatchOfficialsAction,
    assignOfficialToMatchAction,
    removeOfficialFromMatchAction,
    getMatchOfficialsByTypeAction,
    assignMultipleOfficialsToMatchAction,
    removeAllOfficialsOfTypeAction,
} from '@/app/actions/matchOfficial.actions';
import { MatchOfficialWithDetails } from '@/server/domains/matchOfficial';
import { OfficialType } from '@/server/dto/matchOfficial.dto';

const OFFICIALS_TTL = 30 * 60 * 1000;

async function fetchAllOfficials(): Promise<Official[]> {
    const result = await getAllOfficialsAction();
    if (!result.ok) throw new Error(result.error.message);
    return result.value;
}

async function fetchMatchOfficials([, matchId]: [string, string]): Promise<MatchOfficialWithDetails[]> {
    const result = await getMatchOfficialsAction(matchId);
    if (!result.ok) throw new Error(result.error.message);
    return result.value;
}

// --- Hooks ---

export function useOfficials() {
    const { data, error, isLoading, mutate } = useSWR('officials', fetchAllOfficials, {
        dedupingInterval: OFFICIALS_TTL,
        revalidateOnFocus: false,
    });
    return { officials: data ?? [], isLoading, error: error?.message ?? null, mutate };
}

export function useMatchOfficials(matchId: string | null) {
    const key = matchId ? ['matchOfficials', matchId] as const : null;
    const { data, error, isLoading, mutate } = useSWR(key, fetchMatchOfficials as BareFetcher<MatchOfficialWithDetails[]>, {
        dedupingInterval: OFFICIALS_TTL,
        revalidateOnFocus: false,
    });
    return {
        officials: (data as MatchOfficialWithDetails[] | undefined) ?? [],
        isLoading,
        error: error?.message ?? null,
        mutate,
    };
}

// --- Imperative actions ---

export async function searchOfficials(username: string): Promise<RobloxUserWithAvatar[]> {
    const result = await searchOfficialsByNameAction(username);
    if (!result.ok) throw new Error(result.error.message);
    return result.value;
}

export async function saveOfficial(
    robloxUserId: string,
    username: string,
    avatarUrl: string,
    displayName: string,
): Promise<Official | null> {
    const result = await saveOfficialAction({
        robloxUserId,
        username,
        avatarUrl,
        displayName: displayName ?? null,
    });
    if (!result.ok) throw new Error(result.error.message);
    await globalMutate('officials');
    return result.value;
}

export async function fetchMatchOfficialsByType(
    matchId: string,
    officialType: OfficialType,
): Promise<MatchOfficialWithDetails[]> {
    const result = await getMatchOfficialsByTypeAction(matchId, officialType);
    if (!result.ok) throw new Error(result.error.message);
    return result.value;
}

export async function assignOfficialToMatch(
    matchId: string,
    officialId: string,
    officialType: OfficialType,
): Promise<boolean> {
    const result = await assignOfficialToMatchAction({ matchId, officialId, officialType });
    if (!result.ok) throw new Error(result.error.message);
    await globalMutate(['matchOfficials', matchId]);
    return true;
}

export async function assignMultipleOfficials(
    matchId: string,
    officialIds: string[],
    officialType: OfficialType,
): Promise<boolean> {
    const result = await assignMultipleOfficialsToMatchAction({ matchId, officialIds, officialType });
    if (!result.ok) throw new Error(result.error.message);
    await globalMutate(['matchOfficials', matchId]);
    return true;
}

export async function removeOfficialFromMatch(
    matchId: string,
    officialId: string,
    officialType: OfficialType,
): Promise<boolean> {
    const result = await removeOfficialFromMatchAction(matchId, officialId, officialType);
    if (!result.ok) throw new Error(result.error.message);
    await globalMutate(['matchOfficials', matchId]);
    return true;
}

export async function removeAllOfficialsOfType(
    matchId: string,
    officialType: OfficialType,
): Promise<boolean> {
    const result = await removeAllOfficialsOfTypeAction(matchId, officialType);
    if (!result.ok) throw new Error(result.error.message);
    await globalMutate(['matchOfficials', matchId]);
    return true;
}
