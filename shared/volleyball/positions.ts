export type PositionCode = "OUT" | "OPP" | "MID" | "SET" | "LIB";

export const POSITIONS: ReadonlyArray<{code: PositionCode; label: string}> = [
    {code: "OUT", label: "Outside Hitter"},
    {code: "OPP", label: "Opposite"},
    {code: "MID", label: "Middle Blocker"},
    {code: "SET", label: "Setter"},
    {code: "LIB", label: "Libero"},
];

const LABEL_BY_CODE = new Map<string, string>(POSITIONS.map(p => [p.code, p.label]));

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

export const isPositionCode = (v: string): v is PositionCode =>
    v === "OUT" || v === "OPP" || v === "MID" || v === "SET" || v === "LIB";

export const normalizePositionInput = (v: string): PositionCode | null =>
    INPUT_ALIASES[v.trim().toUpperCase()] ?? null;
