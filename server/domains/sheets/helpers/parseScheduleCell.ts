export type ParsedSchedule = { iso: string };

// Parses "May 2nd, 5:00PM [GMT+8]" → full datetime
// Parses "May 2nd" or "May 2nd - May 5th" → start date at midnight UTC
// Status (pending vs scheduled) is determined by the cell's text color, not the format.
export function parseScheduleCell(value: string, year: number): ParsedSchedule | null {
    if (!value?.trim()) return null;

    const fullMatch = value.trim().match(
        /^(\w+)\s+(\d+)(?:st|nd|rd|th)?,\s*(\d+:\d+\s*(?:AM|PM))\s*\[GMT([+-]\d+(?:\.\d+)?)\]/i
    );
    if (fullMatch) {
        const [, month, day, time, offsetStr] = fullMatch;
        const offsetNum = parseFloat(offsetStr);
        if (isNaN(offsetNum)) return null;

        const absHours = Math.floor(Math.abs(offsetNum));
        const absMinutes = Math.round((Math.abs(offsetNum) - absHours) * 60);
        const sign = offsetNum >= 0 ? '+' : '-';
        const paddedHours = String(absHours).padStart(2, '0');
        const paddedMinutes = String(absMinutes).padStart(2, '0');
        const isoOffset = `${sign}${paddedHours}:${paddedMinutes}`;

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

    return null;
}
