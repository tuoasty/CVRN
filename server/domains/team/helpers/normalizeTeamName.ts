// Sheet team-name cells are decorated ("[fire] Titans "), so raw values can't be compared to DB names.

// Variation selector-16, zero-width joiner, keycap combining mark. Built from codepoints rather than
// written inline: all three render as nothing, so a literal would be invisible in this source file.
const ZERO_WIDTH = String.fromCodePoint(0xfe0f, 0x200d, 0x20e3);

// Extended_Pictographic covers emoji proper plus (c) (r) (tm). A bare \p{Emoji} would be wrong here:
// it also matches ASCII digits, '#' and '*', which would mangle names like "Team 99". Flags
// (Regional_Indicator) and skin tones (Emoji_Modifier) are not Extended_Pictographic, so they need
// their own entries.
const EMOJI = new RegExp(
    `[\\p{Extended_Pictographic}\\p{Emoji_Modifier}\\p{Regional_Indicator}${ZERO_WIDTH}]`,
    'gu',
);

/** Strips emoji and collapses whitespace. Preserves case -- use when writing a name. */
export function normalizeTeamName(raw: string): string {
    return raw.replace(EMOJI, '').replace(/\s+/g, ' ').trim();
}

/** Case-insensitive lookup key. Both sides of a name comparison must go through this. */
export function teamNameKey(name: string): string {
    return normalizeTeamName(name).toLowerCase();
}
