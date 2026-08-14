export type ParsedSchedule = { iso: string };

function toIsoOffset(offsetNum: number): string {
    const absHours = Math.floor(Math.abs(offsetNum));
    const absMinutes = Math.round((Math.abs(offsetNum) - absHours) * 60);
    const sign = offsetNum >= 0 ? '+' : '-';
    return `${sign}${String(absHours).padStart(2, '0')}:${String(absMinutes).padStart(2, '0')}`;
}

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

    const dateOnlyMatch = value.trim().match(/^(\w+)\s+(\d+)(?:st|nd|rd|th)?(?:\s*-\s*\w+\s+\d+(?:st|nd|rd|th)?)?$/i);
    if (dateOnlyMatch) {
        const [, month, day] = dateOnlyMatch;
        const date = new Date(`${month} ${day} ${year} 00:00:00 UTC`);
        if (isNaN(date.getTime())) return null;
        return { iso: date.toISOString() };
    }

    return parseNamedTzCell(value.trim(), year);
}

const SLASH_DATE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2})(?::(\d{2}))?\s*(AM|PM)\s*GMT\s*\(?\s*([+-]\d+(?:\.\d+)?)\s*\)?$/i;

const TZ_ABBREV_OFFSETS: Record<string, number> = {
    EST: -5, EDT: -4,
    CST: -6, CDT: -5,
    MST: -7, MDT: -6,
    PST: -8, PDT: -7,
};

const NAMED_TZ = /^(\w+)\s+(\d+)(?:st|nd|rd|th)?,\s*(\d+:\d+\s*(?:AM|PM))\s*([A-Za-z]{2,4})$/i;

const IANA_ZONE_LABELS: Record<string, string> = {
    UK: 'Europe/London',
    GMT: 'Europe/London',
    BST: 'Europe/London',
};

function monthIndex(name: string): number {
    const d = new Date(`${name} 1, 2000`);
    return isNaN(d.getTime()) ? -1 : d.getMonth();
}

function to24Hour(time: string): { hour: number; minute: number } | null {
    const m = time.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!m) return null;
    const [, hh, mm, meridiem] = m;
    const h = parseInt(hh, 10);
    if (h < 1 || h > 12) return null;
    const minute = parseInt(mm, 10);
    if (minute > 59) return null;
    const isPM = meridiem.toUpperCase() === 'PM';
    const hour = isPM ? (h === 12 ? 12 : h + 12) : (h === 12 ? 0 : h);
    return { hour, minute };
}

function zoneOffsetMinutes(timeZone: string, at: Date): number {
    const formatted = new Intl.DateTimeFormat('en-US', {
        timeZone,
        timeZoneName: 'longOffset',
    }).format(at);
    const m = formatted.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/i);
    if (!m) return 0;
    const sign = m[1] === '-' ? -1 : 1;
    const hours = parseInt(m[2], 10);
    const minutes = m[3] ? parseInt(m[3], 10) : 0;
    return sign * (hours * 60 + minutes);
}

function wallClockToIso(
    timeZone: string,
    year: number,
    monthIdx: number,
    day: number,
    hour: number,
    minute: number,
): string | null {
    const guess = Date.UTC(year, monthIdx, day, hour, minute, 0);
    if (isNaN(guess)) return null;
    const offset = zoneOffsetMinutes(timeZone, new Date(guess));
    const utc = guess - offset * 60000;
    const date = new Date(utc);
    if (isNaN(date.getTime())) return null;
    return date.toISOString();
}

function parseNamedTzCell(value: string, year: number): ParsedSchedule | null {
    const namedMatch = value.match(NAMED_TZ);
    if (!namedMatch) return null;

    const [, month, day, time, abbrev] = namedMatch;
    const upper = abbrev.toUpperCase();

    const zone = IANA_ZONE_LABELS[upper];
    if (zone) {
        const monthIdx = monthIndex(month);
        if (monthIdx < 0) return null;
        const parsedTime = to24Hour(time);
        if (!parsedTime) return null;
        const iso = wallClockToIso(zone, year, monthIdx, parseInt(day, 10), parsedTime.hour, parsedTime.minute);
        if (!iso) return null;
        return { iso };
    }

    const offsetNum = TZ_ABBREV_OFFSETS[upper];
    if (offsetNum === undefined) return null;

    const normalizedTime = time.replace(/\s*(AM|PM)$/i, ' $1');
    const dateStr = `${month} ${day} ${year} ${normalizedTime} GMT${toIsoOffset(offsetNum)}`;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    return { iso: date.toISOString() };
}

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

        const iso = `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
            + `T${String(hour24).padStart(2, '0')}:${(minutes ?? '00').padStart(2, '0')}:00`
            + toIsoOffset(offsetNum);

        const date = new Date(iso);
        if (isNaN(date.getTime())) return null;
        return { iso: date.toISOString() };
    }

    const named = parseNamedTzCell(stripped, year);
    if (named) return named;

    return parseScheduleCell(stripped, year);
}
