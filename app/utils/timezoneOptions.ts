import {clientLogger} from "@/app/utils/clientLogger";

export const timezoneOptions = [
    { value: "America/New_York", label: "EST (GMT-5)" },
    { value: "Asia/Singapore", label: "SGT (GMT+8)" },
    { value: "Australia/Brisbane", label: "AEST (GMT+10)" },
    { value: "Australia/Sydney", label: "AEDT (GMT+11)" },
];

export function getRegionTimezone(regionCode: string): string {
    const regionTimezoneMap: Record<string, string> = {
        'na': 'America/New_York',
        'as': 'Asia/Singapore',
        'oce': 'Australia/Brisbane',
        'eu': 'Europe/London',
    };

    return regionTimezoneMap[regionCode.toLowerCase()] || 'UTC';
}

export function getTimezoneOffset(timezone: string): string {
    const offsetMap: Record<string, string> = {
        'America/New_York': 'GMT-5',
        'Asia/Singapore': 'GMT+8',
        'Australia/Brisbane': 'GMT+10',
        'Europe/London': 'GMT+0',
        'UTC': 'GMT+0',
    };

    return offsetMap[timezone] || 'GMT+0';
}

export function formatDateInTimezone(
    date: string | null,
    timezone: string
): string {
    if (!date) return "Time TBD";

    try {
        const d = new Date(date);
        const offset = getTimezoneOffset(timezone);

        const formattedDate = d.toLocaleString('en-US', {
            timeZone: timezone,
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        });

        return `${formattedDate.replace(',', ',')} ${offset}`;
    } catch (error) {
        clientLogger.error("Timezone Options", "Timezone formatting error", {error})
        return "Invalid date";
    }
}