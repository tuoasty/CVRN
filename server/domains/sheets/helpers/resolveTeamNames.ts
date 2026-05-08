import {Team} from "@/shared/types/db";

export function resolveTeamNames(teams: Team[]): Map<string, string> {
    const map = new Map<string, string>();
    for (const team of teams) {
        if (!team.deleted_at) {
            map.set(team.name.toLowerCase().trim(), team.id);
        }
    }
    return map;
}
