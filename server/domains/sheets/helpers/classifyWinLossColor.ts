// Score-inserters mark qualifier cells by text color: a green name/score means "the match
// winner", a red one means "the match loser". This classifies a hex foreground color into that
// win/loss signal. Anything that isn't clearly green or red (white, grey, yellow, null) returns
// null so the caller falls back to positional home-away order.

const DOMINANCE_MARGIN = 25;

export function classifyWinLossColor(hex: string | null): 'win' | 'loss' | null {
    if (!hex) return null;

    const cleaned = hex.replace('#', '').trim();
    if (cleaned.length !== 6) return null;

    const r = parseInt(cleaned.slice(0, 2), 16);
    const g = parseInt(cleaned.slice(2, 4), 16);
    const b = parseInt(cleaned.slice(4, 6), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return null;

    // Green: green channel clearly leads both others.
    if (g - r >= DOMINANCE_MARGIN && g - b >= DOMINANCE_MARGIN) return 'win';
    // Red: red channel clearly leads both others.
    if (r - g >= DOMINANCE_MARGIN && r - b >= DOMINANCE_MARGIN) return 'loss';

    return null;
}
