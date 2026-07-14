export type ParsedSchedule = { iso: string };

// Fractional offsets exist (GMT+5.5), so hours/minutes are split out rather than padded directly.
function toIsoOffset(offsetNum: number): string {
    const absHours = Math.floor(Math.abs(offsetNum));
    const absMinutes = Math.round((Math.abs(offsetNum) - absHours) * 60);
    const sign = offsetNum >= 0 ? '+' : '-';
    return `${sign}${String(absHours).padStart(2, '0')}:${String(absMinutes).padStart(2, '0')}`;
}

// Parses "May 2nd, 5:00PM [GMT+8]" or "January 16th, 8:00 PM GMT (+0)" → full datetime
// Parses "May 2nd" or "May 2nd - May 5th" → start date at midnight UTC
// Status (pending vs scheduled) is determined by the cell's text color, not the format.
export function parseScheduleCell(value: string, year: number): ParsedSchedule | null {
    if (!value?.trim()) return null;

    const fullMatch = value.trim().match(
        /^(\w+)\s+(\d+)(?:st|nd|rd|th)?,\s*(\d+:\d+\s*(?:AM|PM))\s*(?:\[GMT([+-]\d+(?:\.\d+)?)\]|GMT\s*\(([+-]\d+(?:\.\d+)?)\))/i
    );
    if (fullMatch) {
        const [, month, day, time, bracketOffset, parenOffset] = fullMatch;
        const offsetStr = bracketOffset ?? parenOffset;
        const offsetNum = parseFloat(offsetStr);
        if (isNaN(offsetNum)) return null;

        const isoOffset = toIsoOffset(offsetNum);

        const normalizedTime = time.replace(/\s*(AM|PM)$/i, ' $1');
        const dateStr = `${month} ${day} ${year} ${normalizedTime} GMT${isoOffset}`;
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return null;
        return { iso: date.toISOString() };
    }

    // Date-only or date range: "July 5th" or "July 5th - July 7th" — stores start date at midnight UTC
    const dateOnlyMatch = value.trim().match(/^(\w+)\s+(\d+)(?:st|nd|rd|th)?(?:\s*-\s*\w+\s+\d+(?:st|nd|rd|th)?)?$/i);
    if (dateOnlyMatch) {
        const [, month, day] = dateOnlyMatch;
        const date = new Date(`${month} ${day} ${year} 00:00:00 UTC`);
        if (isNaN(date.getTime())) return null;
        return { iso: date.toISOString() };
    }

    // "February 28th, 7:00 PM EST" — named US zone in place of a numeric [GMT±N] offset.
    return parseNamedTzCell(value.trim(), year);
}

// "07/05/2026 5 PM GMT(+8)" / "7/5/2026 5:30 PM GMT (+8)" — minutes and the parens are optional.
const SLASH_DATE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2})(?::(\d{2}))?\s*(AM|PM)\s*GMT\s*\(?\s*([+-]\d+(?:\.\d+)?)\s*\)?$/i;

// US timezone abbreviations → fixed UTC offset (hours). These are intentionally NOT
// DST-resolved: the sheet author writes EST vs EDT (etc.) for the season, and we honor
// the literal label rather than second-guessing it from the match date.
const TZ_ABBREV_OFFSETS: Record<string, number> = {
    EST: -5, EDT: -4,
    CST: -6, CDT: -5,
    MST: -7, MDT: -6,
    PST: -8, PDT: -7,
};

// "February 28th, 7:00 PM EST" — same date/time shape as parseScheduleCell's full form,
// but the zone is a named US abbreviation instead of a numeric [GMT±N] offset.
const NAMED_TZ = /^(\w+)\s+(\d+)(?:st|nd|rd|th)?,\s*(\d+:\d+\s*(?:AM|PM))\s*([A-Za-z]{3})$/i;

// Resolves the named-US-zone form to an ISO instant. Shared by the regular-season
// (parseScheduleCell) and playoff (parsePlayoffScheduleCell) paths so both honor
// EST/EDT/CST/... labels identically. Returns null when the cell isn't this shape.
function parseNamedTzCell(value: string, year: number): ParsedSchedule | null {
    const namedMatch = value.match(NAMED_TZ);
    if (!namedMatch) return null;

    const [, month, day, time, abbrev] = namedMatch;
    const offsetNum = TZ_ABBREV_OFFSETS[abbrev.toUpperCase()];
    if (offsetNum === undefined) return null;

    const normalizedTime = time.replace(/\s*(AM|PM)$/i, ' $1');
    const dateStr = `${month} ${day} ${year} ${normalizedTime} GMT${toIsoOffset(offsetNum)}`;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    return { iso: date.toISOString() };
}

// Playoff sheet cells are prefixed "Date:" and carry either the MM/DD/YYYY form above
// or any of the formats parseScheduleCell already handles. The MM/DD/YYYY form supplies
// its own year, so the `year` argument is only consulted on the fallback path.
export function parsePlayoffScheduleCell(value: string, year: number): ParsedSchedule | null {
    if (!value?.trim()) return null;

    const stripped = value.trim().replace(/^date\s*:\s*/i, '').trim();
    if (!stripped) return null;

    const slashMatch = stripped.match(SLASH_DATE);
    if (slashMatch) {
        const [, month, day, fullYear, hour12, minutes, meridiem, offsetStr] = slashMatch;

        const offsetNum = parseFloat(offsetStr);
        if (isNaN(offsetNum)) return null;

        const h = parseInt(hour12, 10);
        if (h < 1 || h > 12) return null;
        const isPM = meridiem.toUpperCase() === 'PM';
        const hour24 = isPM ? (h === 12 ? 12 : h + 12) : (h === 12 ? 0 : h);

        // Built as an explicit ISO string rather than fed to Date's format sniffing,
        // which is implementation-defined for "MM/DD/YYYY h:mm AM GMT+hh:mm".
        const iso = `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
            + `T${String(hour24).padStart(2, '0')}:${(minutes ?? '00').padStart(2, '0')}:00`
            + toIsoOffset(offsetNum);

        const date = new Date(iso);
        if (isNaN(date.getTime())) return null;
        return { iso: date.toISOString() };
    }

    // "February 28th, 7:00 PM EST" — named US zone in place of a numeric offset.
    const named = parseNamedTzCell(stripped, year);
    if (named) return named;

    return parseScheduleCell(stripped, year);
}
