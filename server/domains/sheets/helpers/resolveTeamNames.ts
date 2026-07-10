import {Team} from "@/shared/types/db";
import {TeamNameHistoryEntry} from "@/server/db/teamNameHistory.repo";
import {teamNameKey} from "@/server/domains/team/helpers/normalizeTeamName";

export function resolveTeamNames(
    teams: Team[],
    history: TeamNameHistoryEntry[] = []
): Map<string, string> {
    const map = new Map<string, string>();
    for (const entry of history) {
        const team = teams.find(t => t.id === entry.teamId);
        if (team && !team.deleted_at) {
            map.set(teamNameKey(entry.oldName), entry.teamId);
        }
    }
    for (const team of teams) {
        if (!team.deleted_at) {
            map.set(teamNameKey(team.name), team.id);
        }
    }
    return map;
}
