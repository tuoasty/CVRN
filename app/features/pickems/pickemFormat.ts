import type {PickemMatchRow} from "@/server/domains/pickem";

export const BULK_PUBLISH_DAYS = 7;

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function formatLockIn(lockAt: string, now: Date): string {
    const ms = new Date(lockAt).getTime() - now.getTime();
    if (ms <= 0) return "locked";
    if (ms < HOUR) return `locks in ${Math.max(1, Math.floor(ms / MINUTE))}m`;
    if (ms < DAY) return `locks in ${Math.floor(ms / HOUR)}h ${Math.floor((ms % HOUR) / MINUTE)}m`;
    return `locks in ${Math.floor(ms / DAY)}d ${Math.floor((ms % DAY) / HOUR)}h`;
}

export function formatOdds(odds: number): string {
    return odds.toFixed(2);
}

export function formatChance(chance: number): string {
    return `${Math.round(chance * 100)}%`;
}

export function bulkPublishCandidates(rows: PickemMatchRow[], now: Date, days: number = BULK_PUBLISH_DAYS): PickemMatchRow[] {
    const until = now.getTime() + days * DAY;
    return rows.filter(row => row.state === "unpublished" && row.scheduledAt !== null && new Date(row.scheduledAt).getTime() <= until);
}

export function matchTitle(row: Pick<PickemMatchRow, "home" | "away">): string {
    return `${row.home?.name ?? "TBD"} vs ${row.away?.name ?? "TBD"}`;
}
