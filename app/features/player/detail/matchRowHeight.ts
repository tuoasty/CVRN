import type {PublicPlayerCard} from "@/server/domains/playerCard";

export const SINGLE_CARD_WIDTH = 260;
export const MULTI_CARD_WIDTH = 220;
const CARD_TOP_GAP = 12;
const MATCH_ROWS = 6;
const STANDARD_CANVAS = {width: 1000, height: 1400};

export function matchRowHeight(cards: Pick<PublicPlayerCard, "width" | "height">[]): number {
    const canvas = cards[0] ?? STANDARD_CANVAS;
    const displayWidth = cards.length > 1 ? MULTI_CARD_WIDTH : SINGLE_CARD_WIDTH;
    return (displayWidth * canvas.height / canvas.width + CARD_TOP_GAP) / MATCH_ROWS;
}
