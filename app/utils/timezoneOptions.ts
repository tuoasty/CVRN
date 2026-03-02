export const timezoneOptions = [
    { value: "America/New_York", label: "EST (GMT-5)" },
    { value: "Asia/Singapore", label: "SGT (GMT+8)" },
    { value: "Australia/Sydney", label: "AEDT (GMT+11)" },
];

export function getRegionTimezone(regionCode: string): string {
    const regionTimezoneMap: Record<string, string> = {
        'na': 'America/New_York',
        'as': 'Asia/Singapore',
        'oce': 'Australia/Sydney',
        'eu': 'Europe/London',
    };

    return regionTimezoneMap[regionCode.toLowerCase()] || 'UTC';
}

export function formatDateInTimezone(
    date: string | null,
    timezone: string
): string {
    if (!date) return "Time TBD";

    try {
        const d = new Date(date);

        return d.toLocaleString('en-US', {
            timeZone: timezone,
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        });
    } catch (error) {
        return "Invalid date";
    }
}