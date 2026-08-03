
const SEPARATORS = /[,/]/;

export function parseOfficialsCell(raw: string | undefined | null, label: 'REFS' | 'MEDIA'): string[] {
    const value = raw?.trim();
    if (!value) return [];

    const labelPattern = new RegExp(`^${label}\\s*:\\s*`, 'i');
    if (!labelPattern.test(value)) return [];

    return value
        .replace(labelPattern, '')
        .split(SEPARATORS)
        .map(name => name.trim())
        .filter(name => name.length > 0);
}
