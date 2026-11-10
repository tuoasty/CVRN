import type {Match, PlayoffBracket} from "@/shared/types/db";

export type BracketEntry = PlayoffBracket & {match: Match};

function findRound(entries: BracketEntry[], round: string): BracketEntry | undefined {
    return entries.find((e) => e.round === round);
}

function isCompleted(entry: BracketEntry | undefined): entry is BracketEntry {
    return entry?.match.status === "completed";
}

function winnerOf(entry: BracketEntry): string | null {
    const home = entry.match.home_sets_won ?? 0;
    const away = entry.match.away_sets_won ?? 0;
    if (home === away) return null;
    return home > away ? entry.match.home_team_id : entry.match.away_team_id;
}

export function isResetUnneeded(entries: BracketEntry[]): boolean {
    const gf = findRound(entries, "grand_final");
    if (!isCompleted(gf)) return false;
    return (gf.match.home_sets_won ?? 0) > (gf.match.away_sets_won ?? 0);
}

export function pruneBracketReset(entries: BracketEntry[]): BracketEntry[] {
    if (!isResetUnneeded(entries)) return entries;
    return entries.filter((e) => e.round !== "bracket_reset");
}

export function findChampion(entries: BracketEntry[]): {bracketId: string; teamId: string} | null {
    const reset = findRound(entries, "bracket_reset");
    const grandFinal = findRound(entries, "grand_final");
    const final = findRound(entries, "final");

    let deciding: BracketEntry | null = null;
    if (isCompleted(reset)) deciding = reset;
    else if (isCompleted(grandFinal) && isResetUnneeded(entries)) deciding = grandFinal;
    else if (!grandFinal && isCompleted(final)) deciding = final;

    if (!deciding) return null;
    const teamId = winnerOf(deciding);
    return teamId ? {bracketId: deciding.id, teamId} : null;
}
