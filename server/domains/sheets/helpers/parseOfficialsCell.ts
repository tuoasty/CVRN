// Playoff blocks carry officials as a single labelled cell. Names are separated by
// commas or slashes, with or without surrounding spaces:
//   "REFS: refA, refB"   "REFS: refA/refB"   "MEDIA: a / b, c"
// An unfilled cell is just the bare label ("REFS:") and yields no names.
//
// The label is required — an unlabelled cell is treated as empty rather than guessed at,
// because every token that survives here is fed to resolveOfficialId, which will hit the
// Roblox API and create a player row for whatever it's handed.

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
