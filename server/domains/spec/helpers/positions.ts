export type {PositionCode as SpecPosition} from "@/shared/volleyball/positions";
export {POSITIONS as SPEC_POSITIONS, positionLabel} from "@/shared/volleyball/positions";

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
