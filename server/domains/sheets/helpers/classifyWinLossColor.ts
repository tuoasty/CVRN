
const DOMINANCE_MARGIN = 25;

export function classifyWinLossColor(hex: string | null): 'win' | 'loss' | null {
    if (!hex) return null;

    const cleaned = hex.replace('#', '').trim();
    if (cleaned.length !== 6) return null;

    const r = parseInt(cleaned.slice(0, 2), 16);
    const g = parseInt(cleaned.slice(2, 4), 16);
    const b = parseInt(cleaned.slice(4, 6), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return null;

    if (g - r >= DOMINANCE_MARGIN && g - b >= DOMINANCE_MARGIN) return 'win';

    if (r - g >= DOMINANCE_MARGIN && r - b >= DOMINANCE_MARGIN) return 'loss';

    return null;
}
