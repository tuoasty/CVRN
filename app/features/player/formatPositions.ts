import {POSITIONS, positionLabel, PositionCode} from "@/shared/volleyball/positions";
import type {PositionCounts} from "@/server/domains/player";

const ORDER = new Map<string, number>(POSITIONS.map((p, i) => [p.code, i]));

export function topPositions(counts: PositionCounts | null | undefined, limit = 2): PositionCode[] {
    if (!counts) return [];
    return (Object.entries(counts) as [PositionCode, number][])
        .filter(([, n]) => (n ?? 0) > 0)
        .sort((a, b) => b[1] - a[1] || ((ORDER.get(a[0]) ?? 99) - (ORDER.get(b[0]) ?? 99)))
        .slice(0, limit)
        .map(([code]) => code);
}

export function formatPositions(counts: PositionCounts | null | undefined): string {
    const top = topPositions(counts);
    return top.length > 0 ? top.join("/") : "—";
}

export function positionsTitle(counts: PositionCounts | null | undefined): string {
    return topPositions(counts).map(positionLabel).join(", ");
}
