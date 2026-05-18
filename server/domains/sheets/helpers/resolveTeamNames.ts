import {Team} from "@/shared/types/db";
import {TeamNameHistoryEntry} from "@/server/db/teamNameHistory.repo";

export function resolveTeamNames(
    teams: Team[],
    history: TeamNameHistoryEntry[] = []
): Map<string, string> {
    const map = new Map<string, string>();
    for (const entry of history) {
        const team = teams.find(t => t.id === entry.teamId);
        if (team && !team.deleted_at) {
            map.set(entry.oldName.toLowerCase().trim(), entry.teamId);
        }
    }
    for (const team of teams) {
        if (!team.deleted_at) {
            map.set(team.name.toLowerCase().trim(), team.id);
        }
    }
    return map;
}
