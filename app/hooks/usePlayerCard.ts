import { useEffect, useState } from "react";
import useSWR, { mutate as globalMutate, type BareFetcher } from "swr";
import {
    createCardGroupAction,
    createCardTemplateAction,
    deleteCardGroupAction,
    deleteCardTemplateAction,
    getCardCatalogAction,
    getPlayerCardsAction,
    previewCustomPlayerCardAction,
    previewPlayerCardAction,
    updateCardGroupAction,
    updateCardTemplateAction,
    updateCardGroupLayersAction,
} from "@/app/actions/playerCard.actions";
import type {
    CardGroup,
    CardLayer,
    CardOverrides,
    CreateCardGroupInput,
    CreateCardTemplateInput,
    PlayerCard,
    PreviewCustomPlayerCardInput,
    UpdateCardGroupInput,
    UpdateCardTemplateInput,
} from "@/server/domains/playerCard";
import type { Result } from "@/shared/types/result";
import { useDebouncedValue } from "@/app/hooks/useDebouncedValue";

export const cardCatalogKey = ["cardCatalog"] as const;

export function playerCardsKey(playerId: string, seasonNumber: number) {
    return ["playerCards", playerId, seasonNumber] as const;
}

export type CardPreviewRequest =
    | {
        kind: "board";
        playerId: string;
        seasonNumber: number;
        templateId: string;
        layers: CardLayer[];
        overrides: CardOverrides;
    }
    | ({ kind: "custom" } & PreviewCustomPlayerCardInput);

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
    const { kind, ...input } = JSON.parse(body) as CardPreviewRequest;
    const result = kind === "custom" ? await previewCustomPlayerCardAction(input) : await previewPlayerCardAction(input);
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

let lastPreviewImage: string | null = null;

export function useCardPreview(request: CardPreviewRequest | null, delayMs = 400) {
    const body = request ? JSON.stringify(request) : null;
    const debounced = useDebouncedValue(body, delayMs);
    const [active, setActive] = useState(debounced);
    const { data, isValidating, error } = useSWR(
        active ? (["cardPreview", active] as const) : null,
        fetchCardPreview,
        { revalidateOnFocus: false, keepPreviousData: true, shouldRetryOnError: false }
    );
    if (!isValidating && debounced !== active) setActive(debounced);
    useEffect(() => {
        if (data) lastPreviewImage = data;
    }, [data]);
    return {
        image: data ?? lastPreviewImage,
        isRendering: isValidating || body !== active,
        error: error instanceof Error ? error.message : null,
    };
}

export function storePlayerCard(card: PlayerCard) {
    return globalMutate(
        playerCardsKey(card.playerId, card.seasonNumber),
        (current: PlayerCard[] | undefined) => [...(current ?? []).filter(c => c.groupId !== card.groupId), card],
        { revalidate: false }
    );
}

export async function saveCardGroupLayers(groupId: string, layers: CardLayer[]) {
    const result = await updateCardGroupLayersAction({ groupId, layers });
    if (result.ok) {
        await globalMutate(
            cardCatalogKey,
            (groups: CardGroup[] | undefined) => groups?.map(g => (g.id === groupId ? { ...g, layers: result.value, layersProblem: null } : g)),
            { revalidate: true }
        );
    }
    return result;
}

async function thenRefreshCatalog<T>(result: Promise<Result<T>>): Promise<Result<T>> {
    const settled = await result;
    if (settled.ok) void globalMutate(cardCatalogKey);
    return settled;
}

export const createCardGroup = (input: CreateCardGroupInput) => thenRefreshCatalog(createCardGroupAction(input));
export const updateCardGroup = (input: UpdateCardGroupInput) => thenRefreshCatalog(updateCardGroupAction(input));
export const deleteCardGroup = (groupId: string) => thenRefreshCatalog(deleteCardGroupAction({ groupId }));
export const createCardTemplate = (input: CreateCardTemplateInput) => thenRefreshCatalog(createCardTemplateAction(input));
export const updateCardTemplate = (input: UpdateCardTemplateInput) => thenRefreshCatalog(updateCardTemplateAction(input));
export const deleteCardTemplate = (templateId: string) => thenRefreshCatalog(deleteCardTemplateAction({ templateId }));
