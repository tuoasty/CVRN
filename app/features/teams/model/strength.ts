import type {TeamStrength} from "@/server/domains/team/types";

export type RankedValue = {value: number | null; rank: number | null};

export function rankValues(
    entries: {id: string; value: number | null}[],
    direction: "desc" | "asc",
): Map<string, RankedValue> {
    const out = new Map<string, RankedValue>();
    const ranked = entries
        .filter((e): e is {id: string; value: number} => e.value != null)
        .sort((a, b) => (direction === "desc" ? b.value - a.value : a.value - b.value));

    let previous: number | null = null;
    let previousRank = 0;
    ranked.forEach((e, i) => {
        const rank = previous !== null && e.value === previous ? previousRank : i + 1;
        out.set(e.id, {value: e.value, rank});
        previous = e.value;
        previousRank = rank;
    });

    for (const e of entries) {
        if (!out.has(e.id)) out.set(e.id, {value: null, rank: null});
    }
    return out;
}

export function seasonStrengths(
    strengths: TeamStrength[],
    seasonId: string,
    teamIds: string[],
): Map<string, RankedValue> {
    const byTeam = new Map(
        strengths.filter((s) => s.seasonId === seasonId).map((s) => [s.teamId, s.rating]),
    );
    return rankValues(
        teamIds.map((id) => ({id, value: byTeam.get(id) ?? null})),
        "desc",
    );
}

export function formatStrength(value: number | null): string {
    if (value == null) return "-";
    const rounded = Math.round(value * 10) / 10;
    if (rounded === 0) return "0.0";
    return `${rounded > 0 ? "+" : ""}${rounded.toFixed(1)}`;
}

export function ordinal(n: number): string {
    const mod100 = n % 100;
    if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
    switch (n % 10) {
        case 1:
            return `${n}st`;
        case 2:
            return `${n}nd`;
        case 3:
            return `${n}rd`;
        default:
            return `${n}th`;
    }
}
