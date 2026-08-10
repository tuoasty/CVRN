export type PositionCode = "OH" | "OP" | "MB" | "S" | "L";

export const POSITIONS: ReadonlyArray<{code: PositionCode; label: string}> = [
    {code: "OH", label: "Outside Hitter"},
    {code: "OP", label: "Opposite"},
    {code: "MB", label: "Middle Blocker"},
    {code: "S", label: "Setter"},
    {code: "L", label: "Libero"},
];

const LABEL_BY_CODE = new Map<string, string>(POSITIONS.map(p => [p.code, p.label]));

export const positionLabel = (code: string): string => LABEL_BY_CODE.get(code) ?? code;

export const isPositionCode = (v: string): v is PositionCode =>
    v === "OH" || v === "OP" || v === "MB" || v === "S" || v === "L";
