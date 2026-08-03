
const ZERO_WIDTH = String.fromCodePoint(0xfe0f, 0x200d, 0x20e3);

const EMOJI = new RegExp(
    `[\\p{Extended_Pictographic}\\p{Emoji_Modifier}\\p{Regional_Indicator}${ZERO_WIDTH}]`,
    'gu',
);

export function normalizeTeamName(raw: string): string {
    return raw.replace(EMOJI, '').replace(/\s+/g, ' ').trim();
}

export function teamNameKey(name: string): string {
    return normalizeTeamName(name).toLowerCase();
}
