import type {CardAttributes} from "@/server/domains/playerCard/types";
import type {PositionCode} from "@/shared/volleyball/positions";

export const STARTER_SLOTS: PositionCode[] = ["SET", "LIB", "MID", "MID", "OPP", "OUT", "OUT"];

const DISPLAY_ORDER: PositionCode[] = ["SET", "OPP", "OUT", "OUT", "MID", "MID", "LIB"];

export interface StarterCandidate {
    playerId: string;
    positions: PositionCode[];
    card: CardAttributes | null;
    perSet: {assists: number; receives: number; blocks: number; kills: number} | null;
}

export interface StarterSlot {
    slot: PositionCode;
    playerId: string | null;
}

const CARD_SCORE: Record<PositionCode, (c: CardAttributes) => number> = {
    SET: (c) => c.setting,
    MID: (c) => c.blocking + c.spiking,
    OPP: (c) => c.scoring + c.spiking,
    OUT: (c) => c.spiking + c.receiving,
    LIB: (c) => c.receiving,
};

const STAT_SCORE: Record<PositionCode, (p: NonNullable<StarterCandidate["perSet"]>) => number> = {
    SET: (p) => p.assists,
    LIB: (p) => p.receives,
    MID: (p) => p.blocks,
    OPP: (p) => p.kills,
    OUT: (p) => p.kills,
};

function pickBest<T>(items: T[], score: (item: T) => number, tiebreak: (a: T, b: T) => number): T | null {
    let best: T | null = null;
    for (const item of items) {
        if (best === null) {
            best = item;
            continue;
        }
        const diff = score(item) - score(best);
        if (diff > 0 || (diff === 0 && tiebreak(item, best) < 0)) best = item;
    }
    return best;
}

export function pickProjectedStarters(candidates: StarterCandidate[]): StarterSlot[] {
    const used = new Set<string>();
    const filled: (string | null)[] = STARTER_SLOTS.map(() => null);

    STARTER_SLOTS.forEach((slot, i) => {
        const eligible = candidates.filter(
            (c): c is StarterCandidate & {card: CardAttributes} =>
                c.card !== null && !used.has(c.playerId) && c.positions.includes(slot),
        );
        const best = pickBest(
            eligible,
            (c) => CARD_SCORE[slot](c.card),
            (a, b) => b.card.ovr - a.card.ovr || a.playerId.localeCompare(b.playerId),
        );
        if (best) {
            filled[i] = best.playerId;
            used.add(best.playerId);
        }
    });

    STARTER_SLOTS.forEach((slot, i) => {
        if (filled[i] !== null) return;
        const eligible = candidates.filter(
            (c): c is StarterCandidate & {perSet: NonNullable<StarterCandidate["perSet"]>} =>
                c.perSet !== null && !used.has(c.playerId),
        );
        const best = pickBest(eligible, (c) => STAT_SCORE[slot](c.perSet), (a, b) => a.playerId.localeCompare(b.playerId));
        if (best) {
            filled[i] = best.playerId;
            used.add(best.playerId);
        }
    });

    const remaining = STARTER_SLOTS.map((slot, i) => ({slot, playerId: filled[i]}));
    return DISPLAY_ORDER.map((slot) => {
        const index = remaining.findIndex((r) => r.slot === slot);
        const [entry] = remaining.splice(index, 1);
        return entry;
    });
}
