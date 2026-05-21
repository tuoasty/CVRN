import {Match, MatchSet} from "@/shared/types/db";
import {MatchWithDetails, MatchWithDetailsRow, RawMatchOfficial} from "../types";

export function toMatchWithDetails(row: MatchWithDetailsRow): MatchWithDetails {
    const bracket = row['playoff_brackets'] as {round: string} | null | undefined;
    return {
        match: row as unknown as Match,
        sets: (row.match_sets ?? []) as MatchSet[],
        officials: (row.match_officials ?? []).map((mo: RawMatchOfficial) => ({
            id: mo.players.id,
            username: mo.players.username,
            display_name: mo.players.display_name,
            avatar_url: mo.players.avatar_url,
            official_type: mo.official_type as "referee" | "media",
        })),
        playoff_round: bracket?.round ?? null,
    };
}
