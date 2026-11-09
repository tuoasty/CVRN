import type {SeasonPhase} from "./types";

export function getSeasonPhase(season: { end_date: string | null; playoff_started: boolean }, now: Date): SeasonPhase {
    if (season.end_date && new Date(season.end_date).getTime() < now.getTime()) return "completed";
    if (season.playoff_started) return "playoffs";
    return "regular";
}

export function regionDayKey(iso: string, timeZone: string): string {
    return new Intl.DateTimeFormat("en-CA", {timeZone, year: "numeric", month: "2-digit", day: "2-digit"}).format(new Date(iso));
}

export function isRegionToday(iso: string | null, timeZone: string, now: Date): boolean {
    if (!iso) return false;
    return regionDayKey(iso, timeZone) === regionDayKey(now.toISOString(), timeZone);
}
