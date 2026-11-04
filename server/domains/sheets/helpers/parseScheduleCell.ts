export type ParsedSchedule = { iso: string };

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

const OFFSET = String.raw`[+-]\d{1,2}(?::\d{2}|\.\d+)?`;
const TIME_AND_ZONE = String.raw`(\d{1,2})(?::(\d{2}))?(?:\s*(AM|PM))?\s*\[?\s*([A-Za-z]{2,4})\b(?:\s*\(?\s*(${OFFSET})\s*\)?)?(?!\s*\(?\s*[+-]?\d{1,4}\b)`;

const MONTH_DAY_TIME = new RegExp(String.raw`\b([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,\s*${TIME_AND_ZONE}`, 'i');
const SLASH_DATE_TIME = new RegExp(String.raw`\b(\d{1,2})/(\d{1,2})/(\d{4})\s+${TIME_AND_ZONE}`, 'i');
const DATE_ONLY = /^(\w+)\s+(\d+)(?:st|nd|rd|th)?(?:\s*-\s*\w+\s+\d+(?:st|nd|rd|th)?)?$/i;

const TZ_ABBREV_OFFSETS: Record<string, number> = {
    UTC: 0,
    EST: -5, EDT: -4,
    CST: -6, CDT: -5,
    MST: -7, MDT: -6,
    PST: -8, PDT: -7,
    BRT: -3,
};

const IANA_ZONE_LABELS: Record<string, string> = {
    UK: 'Europe/London',
    GMT: 'Europe/London',
    BST: 'Europe/London',
};

type WallClock = { year: number; monthIdx: number; day: number; hour: number; minute: number };

function monthIndex(name: string): number {
    return MONTHS.indexOf(name.slice(0, 3).toLowerCase());
}

function to24Hour(
    hourRaw: string,
    minuteRaw: string | undefined,
    meridiem: string | undefined,
): { hour: number; minute: number } | null {
    if (minuteRaw === undefined && !meridiem) return null;
    const hour = parseInt(hourRaw, 10);
    const minute = minuteRaw === undefined ? 0 : parseInt(minuteRaw, 10);
    if (minute > 59) return null;
    if (!meridiem) return hour <= 23 ? { hour, minute } : null;
    if (hour < 1 || hour > 12) return null;
    const isPM = meridiem.toUpperCase() === 'PM';
    return { hour: isPM ? (hour === 12 ? 12 : hour + 12) : (hour === 12 ? 0 : hour), minute };
}

function parseOffsetHours(raw: string): number | null {
    const [hours, minutes] = raw.slice(1).split(':');
    const magnitude = parseFloat(hours) + (minutes ? parseInt(minutes, 10) / 60 : 0);
    if (isNaN(magnitude) || magnitude > 14) return null;
    return raw.startsWith('-') ? -magnitude : magnitude;
}

function fixedOffsetToIso({ year, monthIdx, day, hour, minute }: WallClock, offsetHours: number): string {
    return new Date(Date.UTC(year, monthIdx, day, hour, minute) - offsetHours * 3600000).toISOString();
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

function wallClockToIso(timeZone: string, { year, monthIdx, day, hour, minute }: WallClock): string {
    const guess = Date.UTC(year, monthIdx, day, hour, minute, 0);
    const offset = zoneOffsetMinutes(timeZone, new Date(guess));
    return new Date(guess - offset * 60000).toISOString();
}

function zonedToIso(wallClock: WallClock, zoneRaw: string, offsetRaw: string | undefined): string | null {
    const zone = zoneRaw.toUpperCase();

    if (offsetRaw) {
        if (zone !== 'GMT' && zone !== 'UTC') return null;
        const offsetHours = parseOffsetHours(offsetRaw);
        return offsetHours === null ? null : fixedOffsetToIso(wallClock, offsetHours);
    }

    const ianaZone = IANA_ZONE_LABELS[zone];
    if (ianaZone) return wallClockToIso(ianaZone, wallClock);

    const offsetHours = TZ_ABBREV_OFFSETS[zone];
    return offsetHours === undefined ? null : fixedOffsetToIso(wallClock, offsetHours);
}

function buildSchedule(
    year: number,
    monthIdx: number,
    day: number,
    [hourRaw, minuteRaw, meridiem, zone, offset]: (string | undefined)[],
): ParsedSchedule | null {
    if (monthIdx < 0 || !hourRaw || !zone) return null;

    const dateOnly = new Date(Date.UTC(year, monthIdx, day));
    if (dateOnly.getUTCMonth() !== monthIdx || dateOnly.getUTCDate() !== day) return null;

    const time = to24Hour(hourRaw, minuteRaw, meridiem);
    if (!time) return null;

    const iso = zonedToIso({ year, monthIdx, day, ...time }, zone, offset);
    return iso ? { iso } : null;
}

export function parseScheduleCell(value: string, year: number): ParsedSchedule | null {
    const trimmed = value?.trim();
    if (!trimmed) return null;

    const timed = trimmed.match(MONTH_DAY_TIME);
    if (timed) {
        const [, month, day, ...rest] = timed;
        return buildSchedule(year, monthIndex(month), parseInt(day, 10), rest);
    }

    const dateOnly = trimmed.match(DATE_ONLY);
    if (dateOnly) {
        const [, month, day] = dateOnly;
        const date = new Date(`${month} ${day} ${year} 00:00:00 UTC`);
        if (isNaN(date.getTime())) return null;
        return { iso: date.toISOString() };
    }

    return null;
}

export function parsePlayoffScheduleCell(value: string, year: number): ParsedSchedule | null {
    if (!value?.trim()) return null;

    const stripped = value.trim().replace(/^date\s*:\s*/i, '').trim();
    if (!stripped) return null;

    const slash = stripped.match(SLASH_DATE_TIME);
    if (slash) {
        const [, month, day, fullYear, ...rest] = slash;
        return buildSchedule(parseInt(fullYear, 10), parseInt(month, 10) - 1, parseInt(day, 10), rest);
    }

    return parseScheduleCell(stripped, year);
}
