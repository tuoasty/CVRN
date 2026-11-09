import {isRegionToday} from "./phase";

function parts(iso: string, timeZone: string, options: Intl.DateTimeFormatOptions): Record<string, string> {
    const out: Record<string, string> = {};
    for (const p of new Intl.DateTimeFormat("en-GB", {timeZone, ...options}).formatToParts(new Date(iso))) {
        out[p.type] = p.value;
    }
    return out;
}

export function formatRegionTime(iso: string, timeZone: string): string {
    const p = parts(iso, timeZone, {hour: "2-digit", minute: "2-digit", hourCycle: "h23"});
    return `${p.hour}:${p.minute}`;
}

export function formatRegionDay(iso: string, timeZone: string): string {
    const p = parts(iso, timeZone, {weekday: "short", day: "numeric"});
    return `${p.weekday} ${p.day}`;
}

export function formatRegionDate(iso: string, timeZone: string): string {
    const p = parts(iso, timeZone, {weekday: "short", day: "numeric", month: "short"});
    return `${p.weekday} ${p.day} ${p.month}`;
}

export function formatWhen(iso: string | null, timeZone: string, now: Date): { label: string; isToday: boolean } {
    if (!iso) return {label: "Date TBD", isToday: false};
    if (isRegionToday(iso, timeZone, now)) return {label: formatRegionTime(iso, timeZone), isToday: true};
    return {label: `${formatRegionDate(iso, timeZone)} · ${formatRegionTime(iso, timeZone)}`, isToday: false};
}
