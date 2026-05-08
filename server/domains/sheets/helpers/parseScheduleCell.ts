// Parses "May 2nd, 5:00PM [GMT+8]" → ISO UTC string
export function parseScheduleCell(value: string, year: number): string | null {
    if (!value?.trim()) return null;

    const match = value.trim().match(
        /^(\w+)\s+(\d+)(?:st|nd|rd|th)?,\s*(\d+:\d+\s*(?:AM|PM))\s*\[GMT([+-]\d+(?:\.\d+)?)\]/i
    );
    if (!match) return null;

    const [, month, day, time, offsetStr] = match;
    const offsetNum = parseFloat(offsetStr);
    if (isNaN(offsetNum)) return null;

    // Build offset as ±HH:MM for Date constructor
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
    return date.toISOString();
}
