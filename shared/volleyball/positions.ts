export type PositionCode = "OUT" | "OPP" | "MID" | "SET" | "LIB";

export const POSITIONS: ReadonlyArray<{code: PositionCode; label: string; shortLabel: string}> = [
    {code: "OUT", label: "Outside Hitter", shortLabel: "Outside"},
    {code: "OPP", label: "Opposite", shortLabel: "Opposite"},
    {code: "MID", label: "Middle Blocker", shortLabel: "Middle"},
    {code: "SET", label: "Setter", shortLabel: "Setter"},
    {code: "LIB", label: "Libero", shortLabel: "Libero"},
];

const LABEL_BY_CODE = new Map<string, string>(POSITIONS.map(p => [p.code, p.label]));
const SHORT_LABEL_BY_CODE = new Map<string, string>(POSITIONS.map(p => [p.code, p.shortLabel]));

const INPUT_ALIASES: Record<string, PositionCode> = {
    OUT: "OUT",
    OH: "OUT",
    OP: "OPP",
    OPP: "OPP",
    MID: "MID",
    MB: "MID",
    S: "SET",
    SET: "SET",
    L: "LIB",
    LIB: "LIB",
};

export const positionLabel = (code: string): string => LABEL_BY_CODE.get(code) ?? code;

export const positionShortLabel = (code: string): string => SHORT_LABEL_BY_CODE.get(code) ?? code;

export const isPositionCode = (v: string): v is PositionCode =>
    v === "OUT" || v === "OPP" || v === "MID" || v === "SET" || v === "LIB";

export const normalizePositionInput = (v: string): PositionCode | null =>
    INPUT_ALIASES[v.trim().toUpperCase()] ?? null;
