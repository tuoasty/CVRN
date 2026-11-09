const SEPARATORS = /[,/]/;

const LABELS: Record<'referee' | 'media', RegExp> = {
    referee: /^REF(?:EREE)?S?\s*:\s*/i,
    media: /^MEDIA\s*:\s*/i,
};

export function parseOfficialsCell(raw: string | undefined | null, kind: 'referee' | 'media'): string[] {
    const value = raw?.trim();
    if (!value) return [];

    const labelPattern = LABELS[kind];
    if (!labelPattern.test(value)) return [];

    return value
        .replace(labelPattern, '')
        .split(SEPARATORS)
        .map(name => name.trim())
        .filter(name => name.length > 0);
}
