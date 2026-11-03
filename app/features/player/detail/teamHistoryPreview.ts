import type {PlayerTeamHistoryEntry} from "@/server/domains/player";

export function isSeasonEnded(entry: Pick<PlayerTeamHistoryEntry, "season_end_date">, now: Date = new Date()): boolean {
    return entry.season_end_date !== null && new Date(entry.season_end_date) < now;
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

export function otherActiveTeams(
    history: PlayerTeamHistoryEntry[],
    main: {team_id: string; season_id: string} | null,
    now: Date = new Date(),
): PlayerTeamHistoryEntry[] {
    return history.filter(e =>
        e.left_at === null
        && !isSeasonEnded(e, now)
        && !(main && e.team_id === main.team_id && e.season_id === main.season_id),
    );
}
