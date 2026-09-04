export function ordinalSuffix(n: number): string {
    const rem100 = n % 100;
    if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
    switch (n % 10) {
        case 1: return `${n}st`;
        case 2: return `${n}nd`;
        case 3: return `${n}rd`;
        default: return `${n}th`;
    }
}

export function formatPlacement(startPlace: number, groupSize: number): string {
    if (groupSize <= 1) return ordinalSuffix(startPlace);
    return `${ordinalSuffix(startPlace)}–${ordinalSuffix(startPlace + groupSize - 1)}`;
}
