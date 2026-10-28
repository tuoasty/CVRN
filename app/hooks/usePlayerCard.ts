import useSWR, { type BareFetcher } from "swr";
import { getCardCatalogAction, getPlayerCardsAction } from "@/app/actions/playerCard.actions";
import type { CardGroup, PlayerCard } from "@/server/domains/playerCard";

export const cardCatalogKey = ["cardCatalog"] as const;

export function playerCardsKey(playerId: string, seasonNumber: number) {
    return ["playerCards", playerId, seasonNumber] as const;
}

async function fetchCardCatalog(): Promise<CardGroup[]> {
    const result = await getCardCatalogAction();
    if (!result.ok) throw new Error(result.error.message);
    return result.value;
}

async function fetchPlayerCards([, playerId, seasonNumber]: ReturnType<typeof playerCardsKey>): Promise<PlayerCard[]> {
    const result = await getPlayerCardsAction({ playerId, seasonNumber });
    if (!result.ok) throw new Error(result.error.message);
    return result.value;
}

export function useCardCatalog() {
    const { data, isLoading, error } = useSWR(cardCatalogKey, fetchCardCatalog, { revalidateOnFocus: false });
    return {
        groups: data ?? [],
        isLoading,
        error: error instanceof Error ? error.message : null,
    };
}

export function usePlayerCards(playerId: string | null, seasonNumber: number | null) {
    const { data, isLoading, error, mutate } = useSWR(
        playerId && seasonNumber ? playerCardsKey(playerId, seasonNumber) : null,
        fetchPlayerCards as BareFetcher<PlayerCard[]>,
        { revalidateOnFocus: false }
    );
    return {
        cards: (data as PlayerCard[] | undefined) ?? [],
        isLoading,
        error: error instanceof Error ? error.message : null,
        mutate,
    };
}
