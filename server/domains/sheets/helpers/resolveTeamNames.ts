import {Team} from "@/shared/types/db";
import {TeamNameHistoryEntry} from "@/server/db/teamNameHistory.repo";
import {teamNameKey} from "@/server/domains/team/helpers/normalizeTeamName";

export function resolveTeamNames(
    teams: Team[],
    history: TeamNameHistoryEntry[] = []
): Map<string, string> {
    const map = new Map<string, string>();

    // Disbanded teams are still resolvable — a team can disband mid-season but its
    // completed matches must keep syncing. Apply disbanded first, then active, so an
    // active team always wins a name collision (e.g. a reused or reassigned name).
    const apply = (subset: Team[]) => {
        const ids = new Set(subset.map(t => t.id));
        for (const entry of history) {
            if (ids.has(entry.teamId)) {
                map.set(teamNameKey(entry.oldName), entry.teamId);
            }
        }
        for (const team of subset) {
            map.set(teamNameKey(team.name), team.id);
        }
    };

    apply(teams.filter(t => t.deleted_at));
    apply(teams.filter(t => !t.deleted_at));
    return map;
}
