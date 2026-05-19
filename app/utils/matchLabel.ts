const ROUND_LABELS: Record<string, string> = {
    play_in: "Play-In",
    round_of_16: "Round of 16",
    quarterfinal: "Quarterfinals",
    semifinal: "Semifinals",
    final: "Grand Finals",
    third_place: "3rd Place",
};

export function getMatchTypeLabel(
    matchType: string,
    week: number | null,
    playoffRound: string | null,
    matchNumber?: number
): string {
    if (matchType === "playoffs") {
        return playoffRound ? (ROUND_LABELS[playoffRound] ?? "Playoffs") : "Playoffs";
    }
    if (week != null) {
        return matchNumber != null ? `Week ${week} Match ${matchNumber}` : `Week ${week}`;
    }
    return "Season Match";
}

export function computeMatchLabels(
    matches: Array<{ match: { match_type: string; week: number | null }; playoff_round?: string | null }>
): string[] {
    const weekCounts: Record<number, number> = {};
    return matches.map((m) => {
        if (m.match.match_type === "playoffs") {
            return getMatchTypeLabel("playoffs", null, m.playoff_round ?? null);
        }
        const week = m.match.week ?? 0;
        weekCounts[week] = (weekCounts[week] ?? 0) + 1;
        return getMatchTypeLabel("season", week, null, weekCounts[week]);
    });
}
