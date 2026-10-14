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
