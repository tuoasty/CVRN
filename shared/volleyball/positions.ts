export type PositionCode = "OH" | "OPP" | "MB" | "SET" | "LIB";

export const POSITIONS: ReadonlyArray<{code: PositionCode; label: string}> = [
    {code: "OH", label: "Outside Hitter"},
    {code: "OPP", label: "Opposite"},
    {code: "MB", label: "Middle Blocker"},
    {code: "SET", label: "Setter"},
    {code: "LIB", label: "Libero"},
];

const LABEL_BY_CODE = new Map<string, string>(POSITIONS.map(p => [p.code, p.label]));

const INPUT_ALIASES: Record<string, PositionCode> = {
    OH: "OH",
    OP: "OPP",
    OPP: "OPP",
    MB: "MB",
    S: "SET",
    SET: "SET",
    L: "LIB",
    LIB: "LIB",
};

export const positionLabel = (code: string): string => LABEL_BY_CODE.get(code) ?? code;

export const isPositionCode = (v: string): v is PositionCode =>
    v === "OH" || v === "OPP" || v === "MB" || v === "SET" || v === "LIB";

export const normalizePositionInput = (v: string): PositionCode | null =>
    INPUT_ALIASES[v.trim().toUpperCase()] ?? null;
