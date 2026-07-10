import { isPlayoffRound, roundLabelLong } from "@/app/utils/playoffRounds";

// Parses match number from match_code: "W1-M3" → 3, "PF-2" → 2, unknown → null
export function parseMatchNumber(code: string | null | undefined): number | null {
    if (!code) return null;
    const season = code.match(/^W\d+-M(\d+)$/i);
    if (season) return parseInt(season[1], 10);
    const suffix = code.match(/-M?(\d+)$/i);
    if (suffix) return parseInt(suffix[1], 10);
    return null;
}

export function getMatchTypeLabel(
    matchType: string,
    week: number | null,
    playoffRound: string | null,
    matchNumber?: number
): string {
    if (matchType === "playoffs") {
        return isPlayoffRound(playoffRound) ? roundLabelLong(playoffRound) : "Playoffs";
    }
    if (week != null) {
        return matchNumber != null ? `Week ${week} Match ${matchNumber}` : `Week ${week}`;
    }
    return "Season Match";
}

export function computeMatchLabels(
    matches: Array<{ match: { match_type: string; week: number | null; match_code?: string | null }; playoff_round?: string | null }>
): string[] {
    const weekCounts: Record<number, number> = {};
    return matches.map((m) => {
        if (m.match.match_type === "playoffs") {
            return getMatchTypeLabel("playoffs", null, m.playoff_round ?? null);
        }
        const week = m.match.week ?? 0;
        const codeNum = parseMatchNumber(m.match.match_code);
        if (codeNum !== null) {
            return getMatchTypeLabel("season", week, null, codeNum);
        }
        // fallback: positional count when no match code present
        weekCounts[week] = (weekCounts[week] ?? 0) + 1;
        return getMatchTypeLabel("season", week, null, weekCounts[week]);
    });
}
