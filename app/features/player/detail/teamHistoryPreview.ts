import type {PlayerTeamHistoryEntry} from "@/server/domains/player";
import {isSeasonActiveAt} from "@/server/domains/season/helpers/isSeasonActive";

export function isSeasonEnded(entry: Pick<PlayerTeamHistoryEntry, "season_end_date">, now: Date = new Date()): boolean {
    return !isSeasonActiveAt({end_date: entry.season_end_date}, now);
}

export function teamRowKey(entry: Pick<PlayerTeamHistoryEntry, "team_id" | "season_id">, index: number): string {
    return `${entry.team_id}-${entry.season_id}-${index}`;
}

export function careerStatus(entry: PlayerTeamHistoryEntry, now: Date = new Date()): "Active" | "Left" | null {
    if (entry.left_at !== null) return "Left";
    return isSeasonEnded(entry, now) ? null : "Active";
}

function newestFirst(a: PlayerTeamHistoryEntry, b: PlayerTeamHistoryEntry): number {
    return b.season_start_date.localeCompare(a.season_start_date) || b.joined_at.localeCompare(a.joined_at);
}

function endedSeasonRow(entries: PlayerTeamHistoryEntry[]): PlayerTeamHistoryEntry {
    const stayed = entries.filter(e => e.left_at === null);
    const pool = stayed.length > 0 ? stayed : entries;
    return pool.reduce((latest, e) => (e.joined_at > latest.joined_at ? e : latest));
}

export function selectTeamHistoryPreview(
    history: PlayerTeamHistoryEntry[],
    now: Date = new Date(),
): {visible: PlayerTeamHistoryEntry[]; hiddenCount: number} {
    const active = history.filter(e => !isSeasonEnded(e, now)).sort(newestFirst);
    const endedBySeason = new Map<string, PlayerTeamHistoryEntry[]>();
    for (const entry of history) {
        if (!isSeasonEnded(entry, now)) continue;
        endedBySeason.set(entry.season_id, [...(endedBySeason.get(entry.season_id) ?? []), entry]);
    }
    const ended = [...endedBySeason.values()].map(endedSeasonRow).sort(newestFirst);
    const visible = [...active, ...ended];
    return {visible, hiddenCount: history.length - visible.length};
}

export function activeTeamsMainFirst(
    history: PlayerTeamHistoryEntry[],
    main: {team_id: string; season_id: string} | null,
    now: Date = new Date(),
): PlayerTeamHistoryEntry[] {
    const active = history.filter(e => e.left_at === null && !isSeasonEnded(e, now));
    const isMain = (e: PlayerTeamHistoryEntry) => main !== null && e.team_id === main.team_id && e.season_id === main.season_id;
    return [...active.filter(isMain), ...active.filter(e => !isMain(e))];
}
