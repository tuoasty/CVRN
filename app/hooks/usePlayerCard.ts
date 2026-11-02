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
    uploadCardTemplateArtAction,
} from "@/app/actions/playerCard.actions";
import { checkArtFile } from "@/app/features/playerCard/cardArt";
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
import { Err, Ok, type Result } from "@/shared/types/result";
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
    if (settled.ok) await globalMutate(cardCatalogKey);
    return settled;
}

export const createCardGroup = (input: CreateCardGroupInput) => thenRefreshCatalog(createCardGroupAction(input));
export const updateCardGroup = (input: UpdateCardGroupInput) => thenRefreshCatalog(updateCardGroupAction(input));
export const deleteCardGroup = (groupId: string) => thenRefreshCatalog(deleteCardGroupAction({ groupId }));
export const createCardTemplate = (input: CreateCardTemplateInput) => thenRefreshCatalog(createCardTemplateAction(input));
export const updateCardTemplate = (input: UpdateCardTemplateInput) => thenRefreshCatalog(updateCardTemplateAction(input));
export const deleteCardTemplate = (templateId: string) => thenRefreshCatalog(deleteCardTemplateAction({ templateId }));

async function sendCardArt(templateId: string, fileName: string, file: File): Promise<Result<{ width: number; height: number }>> {
    const problem = await checkArtFile(file);
    if (problem) return Err({ message: problem, code: "VALIDATION_ERROR" });
    const body = new FormData();
    body.set("templateId", templateId);
    body.set("fileName", fileName);
    body.set("file", file);
    try {
        return await uploadCardTemplateArtAction(body);
    } catch {
        return Err({ message: "Upload failed. The file may be over the 2.9 MB limit, or the connection dropped.", code: "INTEGRATION_ERROR" });
    }
}

async function refreshAfterArtChange() {
    await globalMutate(cardCatalogKey);
    await globalMutate((key: unknown) => Array.isArray(key) && key[0] === "cardPreview", undefined, { revalidate: true });
}

export async function uploadCardArt(templateId: string, fileName: string, file: File) {
    const result = await sendCardArt(templateId, fileName, file);
    if (result.ok) await refreshAfterArtChange();
    return result;
}

export interface CardArtUploadFailure {
    name: string;
    message: string;
}

export async function createCardTierWithArt(
    input: CreateCardTemplateInput,
    files: { name: string; file: File }[],
): Promise<Result<{ templateId: string; failed: CardArtUploadFailure[] }>> {
    for (const { file } of files) {
        const problem = await checkArtFile(file);
        if (problem) return Err({ message: problem, code: "VALIDATION_ERROR" });
    }

    const created = await createCardTemplateAction(input);
    if (!created.ok) return created;

    const failed: CardArtUploadFailure[] = [];
    for (const { name, file } of files) {
        const uploaded = await sendCardArt(created.value.id, name, file);
        if (!uploaded.ok) failed.push({ name, message: uploaded.error.message });
    }

    await refreshAfterArtChange();
    return Ok({ templateId: created.value.id, failed });
}
