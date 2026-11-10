import type {MatchWithDetails} from "@/server/domains/match";
import {rankValues, type RankedValue} from "@/app/features/teams/model/strength";

export function opponentsByTeam(matches: MatchWithDetails[]): Map<string, string[]> {
    const out = new Map<string, string[]>();
    const seen = new Set<string>();
    const add = (teamId: string, opponentId: string) => {
        const list = out.get(teamId) ?? [];
        list.push(opponentId);
        out.set(teamId, list);
    };
    for (const {match} of matches) {
        if (seen.has(match.id)) continue;
        seen.add(match.id);
        if (!match.home_team_id || !match.away_team_id) continue;
        add(match.home_team_id, match.away_team_id);
        add(match.away_team_id, match.home_team_id);
    }
    return out;
}

export function scheduleStrength(input: {
    matchesByTeam: Map<string, string[]>;
    strengths: Map<string, RankedValue>;
}): Map<string, RankedValue> {
    const entries = [...input.matchesByTeam.entries()].map(([id, opponents]) => {
        const values = opponents
            .map((o) => input.strengths.get(o)?.value)
            .filter((v): v is number => v != null);
        return {id, value: values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null};
    });
    return rankValues(entries, "desc");
}
