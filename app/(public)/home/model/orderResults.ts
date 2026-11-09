import type {MatchWithDetails} from "@/server/domains/match";
import type {SeasonPhase} from "./types";

const time = (m: MatchWithDetails) => (m.match.scheduled_at ? new Date(m.match.scheduled_at).getTime() : 0);

const groupKey = (m: MatchWithDetails) =>
    m.match.match_type === "playoffs" ? `round:${m.playoff_round ?? ""}` : `week:${m.match.week ?? ""}`;

export function orderResults(completed: MatchWithDetails[], phase: SeasonPhase, fill = 10): MatchWithDetails[] {
    const pool = phase === "completed" ? completed.filter(m => m.match.match_type === "playoffs") : completed;
    const sorted = [...pool].sort((a, b) => time(b) - time(a));
    if (sorted.length === 0) return [];
    const latestKey = groupKey(sorted[0]);
    const latest = sorted.filter(m => groupKey(m) === latestKey);
    if (latest.length >= fill) return latest;
    const rest = sorted.filter(m => groupKey(m) !== latestKey);
    return [...latest, ...rest.slice(0, fill - latest.length)];
}
