export type SpecPosition = "OH" | "OP" | "MB" | "S" | "L";

export const SPEC_POSITIONS: ReadonlyArray<{code: SpecPosition; label: string}> = [
    {code: "OH", label: "Outside Hitter"},
    {code: "OP", label: "Opposite"},
    {code: "MB", label: "Middle Blocker"},
    {code: "S", label: "Setter"},
    {code: "L", label: "Libero"},
];

const LABEL_BY_CODE = new Map<string, string>(SPEC_POSITIONS.map(p => [p.code, p.label]));

export const positionLabel = (code: string): string => LABEL_BY_CODE.get(code) ?? code;

export function formatHeight(inches: number): string {
    const feet = Math.floor(inches / 12);
    const rem = inches % 12;
    return `${feet}'${rem}"`;
}

export const parseHeight = (feet: number, inches: number): number => feet * 12 + inches;

export function parseHeightString(value: string): number | null {
    const m = value.trim().match(/^(\d+)\s*['’]?\s*(\d+)?\s*"?$/);
    if (!m) return null;
    const feet = Number(m[1]);
    const inches = m[2] ? Number(m[2]) : 0;
    if (inches > 11) return null;
    return feet * 12 + inches;
}
