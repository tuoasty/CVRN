import {clientLogger} from "@/app/utils/clientLogger";

export const timezoneOptions = [
    { value: "America/New_York", label: "EST (GMT-5)" },
    { value: "America/Sao_Paulo", label: "BRT (GMT-3)" },
    { value: "Asia/Singapore", label: "SGT (GMT+8)" },
    { value: "Australia/Brisbane", label: "AEST (GMT+10)" },
    { value: "Australia/Sydney", label: "AEDT (GMT+11)" },
];

export function getRegionTimezone(regionCode: string): string {
    const regionTimezoneMap: Record<string, string> = {
        'na': 'America/New_York',
        'sa': 'America/Sao_Paulo',
        'as': 'Asia/Singapore',
        'oce': 'Australia/Brisbane',
        'eu': 'Europe/London',
    };

    return regionTimezoneMap[regionCode.toLowerCase()] || 'UTC';
}

/**
 * Offset label for a zone *at a given instant*. Must be computed rather than hardcoded: London is
 * GMT+0 in winter but GMT+1 on BST, and New York is GMT-5 in winter but GMT-4 on EDT. Pass the
 * match's own date so a January fixture stays labelled GMT+0 even when viewed in July.
 */
export function getTimezoneOffset(timezone: string, date: Date = new Date()): string {
    try {
        // 'longOffset' yields "GMT+01:00"; UTC yields a bare "GMT".
        const raw = new Intl.DateTimeFormat('en-US', {timeZone: timezone, timeZoneName: 'longOffset'})
            .formatToParts(date)
            .find(p => p.type === 'timeZoneName')?.value ?? 'GMT';

        const m = raw.match(/^GMT([+-])(\d{2}):(\d{2})$/);
        if (!m) return 'GMT+0';

        const [, sign, hh, mm] = m;
        const hours = parseInt(hh, 10);
        return mm === '00' ? `GMT${sign}${hours}` : `GMT${sign}${hours}:${mm}`;
    } catch {
        return 'GMT+0';
    }
}

export function formatDateInTimezone(
    date: string | null,
    timezone: string
): string {
    if (!date) return "Time TBD";

    try {
        const d = new Date(date);
        const offset = getTimezoneOffset(timezone, d);

        const formattedDate = d.toLocaleString('en-US', {
            timeZone: timezone,
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        });

        return `${formattedDate} ${offset}`;
    } catch (error) {
        clientLogger.error("Timezone Options", "Timezone formatting error", {error})
        return "Invalid date";
    }
}