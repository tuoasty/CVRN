import useSWR, { mutate as globalMutate, type BareFetcher } from "swr";
import {
    getCardCatalogAction,
    getPlayerCardsAction,
    previewPlayerCardAction,
    updateCardTemplateLayersAction,
} from "@/app/actions/playerCard.actions";
import type { CardGroup, CardLayer, CardOverrides, PlayerCard } from "@/server/domains/playerCard";
import { useDebouncedValue } from "@/app/hooks/useDebouncedValue";

export const cardCatalogKey = ["cardCatalog"] as const;

export function playerCardsKey(playerId: string, seasonNumber: number) {
    return ["playerCards", playerId, seasonNumber] as const;
}

export interface CardPreviewRequest {
    playerId: string;
    seasonNumber: number;
    templateId: string;
    layers: CardLayer[];
    overrides: CardOverrides;
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

async function fetchCardPreview([, body]: readonly [string, string]): Promise<string> {
    const result = await previewPlayerCardAction(JSON.parse(body));
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

export function useCardPreview(request: CardPreviewRequest | null, delayMs = 400) {
    const body = request ? JSON.stringify(request) : null;
    const debounced = useDebouncedValue(body, delayMs);
    const { data, isValidating, error } = useSWR(
        debounced ? (["cardPreview", debounced] as const) : null,
        fetchCardPreview,
        { revalidateOnFocus: false, keepPreviousData: true, shouldRetryOnError: false }
    );
    return {
        image: data ?? null,
        isRendering: isValidating || body !== debounced,
        error: error instanceof Error ? error.message : null,
    };
}

export async function saveCardTemplateLayers(templateId: string, layers: CardLayer[]) {
    const result = await updateCardTemplateLayersAction({ templateId, layers });
    if (result.ok) {
        await globalMutate(
            cardCatalogKey,
            (groups: CardGroup[] | undefined) => groups?.map(g => ({
                ...g,
                templates: g.templates.map(t => (t.id === templateId
                    ? { ...t, layers: result.value, layerCount: result.value.length, problem: null }
                    : t)),
            })),
            { revalidate: false }
        );
    }
    return result;
}
