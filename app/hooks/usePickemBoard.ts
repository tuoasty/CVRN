import useSWR, {mutate as globalMutate} from "swr";
import useSWRInfinite from "swr/infinite";
import {
    getPickemActivityAction,
    getPickemBoardAction,
    getPickemMatchDetailAction,
    getPickemMatchSettlementAction,
    previewPickemSettlementAction,
    publishPickemMatchesAction,
    refundPickemMarketsAction,
    settlePickemMatchesAction,
    updatePickemSettingsAction,
} from "@/app/actions/pickem.actions";
import type {
    PickemActivityCursor,
    PickemActivityPage,
    PickemActivitySource,
    PickemBoard,
    PickemMatchDetail,
    PickemMatchSettlement,
    PickemSettings,
    PickemSettingsInput,
    PickemSettlePreview,
} from "@/server/domains/pickem";
import type {Result} from "@/shared/types/result";

const PICKEM_BOARD_TTL = 30 * 1000;

export const pickemBoardKey = (seasonId: string) => ["pickem-board", seasonId] as const;

async function fetchBoard([, seasonId]: readonly [string, string]): Promise<PickemBoard> {
    const result = await getPickemBoardAction({seasonId});
    if (!result.ok) throw new Error(result.error.message);
    return result.value;
}

export function usePickemBoard(seasonId: string | null) {
    const {data, error, isLoading} = useSWR(
        seasonId ? pickemBoardKey(seasonId) : null,
        fetchBoard,
        {dedupingInterval: PICKEM_BOARD_TTL, refreshInterval: 60 * 1000, revalidateOnFocus: true},
    );
    return {board: data ?? null, isLoading, error: error?.message ?? null};
}

export async function publishPickemMatches(seasonId: string, matchIds: string[]): Promise<Result<PickemBoard>> {
    const result = await publishPickemMatchesAction({seasonId, matchIds});
    if (result.ok) await globalMutate(pickemBoardKey(seasonId), result.value, {revalidate: false});
    return result;
}

export async function updatePickemSettings(seasonId: string, input: PickemSettingsInput): Promise<Result<PickemSettings>> {
    const result = await updatePickemSettingsAction(input);
    if (result.ok) {
        await globalMutate(
            pickemBoardKey(seasonId),
            (board: PickemBoard | undefined) => (board ? {...board, settings: result.value} : board),
            {revalidate: false},
        );
    }
    return result;
}

export function previewPickemSettlement(seasonId: string, matchIds: string[]): Promise<Result<PickemSettlePreview>> {
    return previewPickemSettlementAction({seasonId, matchIds});
}

export const pickemDetailKey = (matchId: string) => ["pickem-match-detail", matchId] as const;

export async function settlePickemMatches(seasonId: string, matchIds: string[]): Promise<Result<PickemBoard>> {
    const result = await settlePickemMatchesAction({seasonId, matchIds});
    if (result.ok) {
        await globalMutate(pickemBoardKey(seasonId), result.value, {revalidate: false});
        await Promise.all(matchIds.map(id => globalMutate(pickemDetailKey(id))));
    }
    return result;
}

export async function refundPickemMarkets(seasonId: string, matchId: string, marketIds: string[]): Promise<Result<PickemBoard>> {
    const result = await refundPickemMarketsAction({seasonId, marketIds});
    if (result.ok) {
        await globalMutate(pickemBoardKey(seasonId), result.value, {revalidate: false});
        await globalMutate(pickemDetailKey(matchId));
    }
    return result;
}

async function fetchMatchDetail([, matchId]: readonly [string, string]): Promise<PickemMatchDetail> {
    const result = await getPickemMatchDetailAction({matchId});
    if (!result.ok) throw new Error(result.error.message);
    return result.value;
}

export function usePickemMatchDetail(matchId: string) {
    const {data, error, isLoading} = useSWR(pickemDetailKey(matchId), fetchMatchDetail, {
        refreshInterval: 60 * 1000,
        revalidateOnFocus: true,
    });
    return {detail: data ?? null, isLoading, error: error?.message ?? null};
}

async function fetchMatchSettlement([, matchId]: readonly [string, string]): Promise<PickemMatchSettlement | null> {
    const result = await getPickemMatchSettlementAction({matchId});
    return result.ok ? result.value : null;
}

export function usePickemMatchSettlement(matchId: string, enabled: boolean): PickemMatchSettlement | null {
    const {data} = useSWR(enabled ? ["pickem-match-settlement", matchId] as const : null, fetchMatchSettlement, {revalidateOnFocus: false});
    return data ?? null;
}

type ActivityKey = readonly ["pickem-activity", string, PickemActivitySource, PickemActivityCursor | null];

async function fetchActivityPage([, seasonId, source, before]: ActivityKey): Promise<PickemActivityPage> {
    const result = await getPickemActivityAction({seasonId, source, before: before ?? undefined});
    if (!result.ok) throw new Error(result.error.message);
    return result.value;
}

export function usePickemActivity(seasonId: string, source: PickemActivitySource) {
    const getKey = (index: number, previous: PickemActivityPage | null): ActivityKey | null => {
        if (previous && previous.nextCursor === null) return null;
        return ["pickem-activity", seasonId, source, index === 0 ? null : previous?.nextCursor ?? null];
    };

    const {data, error, isLoading, isValidating, size, setSize} = useSWRInfinite(getKey, fetchActivityPage, {
        revalidateOnFocus: true,
        revalidateFirstPage: true,
        refreshInterval: 60 * 1000,
    });

    const pages = data ?? [];
    const last = pages[pages.length - 1];
    return {
        entries: pages.flatMap(p => p.entries),
        hasMore: !!last && last.nextCursor !== null,
        isLoading,
        isLoadingMore: isValidating && size > pages.length,
        error: error?.message ?? null,
        loadMore: () => setSize(size + 1),
    };
}
