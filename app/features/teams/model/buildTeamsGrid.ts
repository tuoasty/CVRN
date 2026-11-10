import type {SeasonRosterEntry, TeamWithRegion} from "@/server/domains/team/types";
import type {RankedValue} from "./strength";

export type TeamsSort = "strength" | "az";

export interface TeamTile {
    team: TeamWithRegion;
    strength: RankedValue;
}

const UNRATED: RankedValue = {value: null, rank: null};

function byName(a: TeamTile, b: TeamTile): number {
    return a.team.name.localeCompare(b.team.name, undefined, {sensitivity: "base"});
}

export function buildTeamsGrid(input: {
    teams: TeamWithRegion[];
    strengths: Map<string, RankedValue>;
    rosters: SeasonRosterEntry[];
    sort: TeamsSort;
    query: string;
}): {tiles: TeamTile[]; strengthAvailable: boolean; effectiveSort: TeamsSort} {
    const all: TeamTile[] = input.teams
        .filter((t) => !t.is_bye)
        .map((team) => ({team, strength: input.strengths.get(team.id) ?? UNRATED}));

    const strengthAvailable = all.some((t) => t.strength.value != null);
    const effectiveSort: TeamsSort = strengthAvailable ? input.sort : "az";

    const q = input.query.trim().toLowerCase();
    let tiles = all;
    if (q) {
        const rosterHits = new Set(
            input.rosters
                .filter((r) => r.displayName?.toLowerCase().includes(q) || r.username?.toLowerCase().includes(q))
                .map((r) => r.teamId),
        );
        tiles = all.filter((t) => t.team.name.toLowerCase().includes(q) || rosterHits.has(t.team.id));
    }

    const sorted = [...tiles].sort((a, b) => {
        if (effectiveSort === "strength") {
            const av = a.strength.value;
            const bv = b.strength.value;
            if (av != null && bv != null && av !== bv) return bv - av;
            if (av != null && bv == null) return -1;
            if (av == null && bv != null) return 1;
        }
        return byName(a, b);
    });

    return {tiles: sorted, strengthAvailable, effectiveSort};
}
