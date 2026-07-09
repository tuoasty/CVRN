// Playoff blocks carry officials as a single labelled cell:
//   "REFS: refA, refB"   /   "MEDIA: mediaA, mediaB"
// The label is required — an unlabelled cell is treated as empty rather than guessed at,
// because every token that survives here is fed to resolveOfficialId, which will hit the
// Roblox API and create a player row for whatever it's handed.

const PLACEHOLDER_TOKENS = new Set(['tbd', 'n/a', 'na', 'none', '-', '?']);

export function parseOfficialsCell(raw: string | undefined | null, label: 'REFS' | 'MEDIA'): string[] {
    const value = raw?.trim();
    if (!value) return [];

    const labelPattern = new RegExp(`^${label}\\s*:\\s*`, 'i');
    if (!labelPattern.test(value)) return [];

    return value
        .replace(labelPattern, '')
        .split(',')
        .map(name => name.trim())
        .filter(name => name.length > 0 && !PLACEHOLDER_TOKENS.has(name.toLowerCase()));
}
