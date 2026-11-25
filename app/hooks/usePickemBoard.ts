import useSWR, {mutate as globalMutate} from "swr";
import {
    getPickemBoardAction,
    publishPickemMatchesAction,
    updatePickemSettingsAction,
} from "@/app/actions/pickem.actions";
import type {PickemBoard, PickemSettings, PickemSettingsInput} from "@/server/domains/pickem";
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
