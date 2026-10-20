export type HeightRangeByStar = Record<number, number>;

export const HEIGHT_RANGE_STARS = [3, 4, 5] as const;

export const DEFAULT_HEIGHT_RANGE = 2;

export const DEFAULT_HEIGHT_RANGE_BY_STAR: HeightRangeByStar = {3: 2, 4: 2, 5: 2};

export function heightRangeFor(byStar: HeightRangeByStar | undefined, stars: number): number {
    return byStar?.[stars] ?? DEFAULT_HEIGHT_RANGE;
}

export function normalizeHeightRanges(raw: unknown): HeightRangeByStar {
    const out: HeightRangeByStar = {...DEFAULT_HEIGHT_RANGE_BY_STAR};
    if (!raw || typeof raw !== "object") return out;
    for (const star of HEIGHT_RANGE_STARS) {
        const value = (raw as Record<string, unknown>)[String(star)];
        if (typeof value === "number" && Number.isInteger(value) && value >= 0) out[star] = value;
    }
    return out;
}
