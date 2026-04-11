import {Match, MatchSet} from "@/shared/types/db";
import {MatchWithDetails} from "../types";

export function toMatchWithDetails(row: any): MatchWithDetails {
    return {
        match: row as unknown as Match,
        sets: (row.match_sets ?? []) as MatchSet[],
        officials: (row.match_officials ?? []).map((mo: any) => ({
            id: mo.officials.id,
            username: mo.officials.username,
            display_name: mo.officials.display_name,
            avatar_url: mo.officials.avatar_url,
            official_type: mo.official_type,
        })),
    };
}
