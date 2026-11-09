import type {MatchWithDetails} from "@/server/domains/match";
import {regionDayKey} from "./phase";
import {formatRegionDay} from "./format";

export interface UpcomingGroupDay {
    key: string;
    label: string;
    isToday: boolean;
    matches: MatchWithDetails[];
}

export function groupUpcoming(upcoming: MatchWithDetails[], timeZone: string, now: Date): UpcomingGroupDay[] {
    const todayKey = regionDayKey(now.toISOString(), timeZone);
    const sorted = upcoming
        .filter(m => !m.match.scheduled_at || regionDayKey(m.match.scheduled_at, timeZone) >= todayKey)
        .sort((a, b) => {
            const at = a.match.scheduled_at;
            const bt = b.match.scheduled_at;
            if (at && bt) return at.localeCompare(bt);
            if (at) return -1;
            if (bt) return 1;
            return 0;
        });

    const days: UpcomingGroupDay[] = [];
    for (const m of sorted) {
        const iso = m.match.scheduled_at;
        const key = iso ? regionDayKey(iso, timeZone) : "tbd";
        let day = days.find(d => d.key === key);
        if (!day) {
            const isToday = key === todayKey;
            const label = iso ? formatRegionDay(iso, timeZone) : "Date TBD";
            day = {key, label: isToday ? `Today · ${label}` : label, isToday, matches: []};
            days.push(day);
        }
        day.matches.push(m);
    }
    return days;
}
