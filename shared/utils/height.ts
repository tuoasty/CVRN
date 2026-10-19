export function formatHeight(inches: number): string {
    const feet = Math.floor(inches / 12);
    const rem = inches % 12;
    return `${feet}'${rem}"`;
}

export function gameHeightToInches(height: number): number {
    return Math.round(height * 40 + 24);
}

export function formatGameHeight(height: number): string {
    return formatHeight(gameHeightToInches(height));
}

export function formatGameHeightRange(min: number, max: number): string {
    const low = formatGameHeight(min);
    const high = formatGameHeight(max);
    return low === high ? low : `${low} to ${high}`;
}
