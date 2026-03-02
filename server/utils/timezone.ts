import { logger } from "@/server/utils/logger";

/**
 * Converts date + time + timezone to UTC ISO string
 * @param date YYYY-MM-DD format
 * @param time HH:MM format (24-hour)
 * @param timezone IANA timezone (e.g., "America/New_York", "Asia/Jakarta")
 * @returns ISO 8601 timestamptz string in UTC, or null if invalid
 */

export function convertToUTC(
    date: string,
    time: string,
    timezone: string
): string | null {
    try {
        const dateTimeString = `${date}T${time}`;

        const localeDateString = new Date(dateTimeString).toLocaleString('en-US', {
            timeZone: timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });

        const adjustedDate = new Date(dateTimeString);
        const targetDate = new Date(localeDateString);

        const diff = adjustedDate.getTime() - targetDate.getTime();
        const utcDate = new Date(adjustedDate.getTime() + diff);

        if (isNaN(utcDate.getTime())) {
            logger.warn({ date, time, timezone }, "Invalid date/time format");
            return null;
        }

        return utcDate.toISOString();
    } catch (error) {
        logger.error({ date, time, timezone, error }, "Failed to convert to UTC");
        return null;
    }
}

export function isValidTimezone(timezone: string): boolean {
    try {
        Intl.DateTimeFormat(undefined, { timeZone: timezone });
        return true;
    } catch {
        return false;
    }
}