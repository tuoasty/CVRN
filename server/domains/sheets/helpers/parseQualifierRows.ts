import {ParsedMatchResult, SyncError} from "@/server/domains/sheets/types";
import {normalizeTeamName, teamNameKey} from "@/server/domains/team/helpers/normalizeTeamName";
import {classifyWinLossColor} from "@/server/domains/sheets/helpers/classifyWinLossColor";
import {logger} from "@/server/utils/logger";

const COL_CODE = 4;      // E
const COL_HOME = 6;      // G
const COL_AWAY = 8;      // I
const COL_SCHEDULE = 10; // K
const COL_SET_START = 12; // M (Sets 1-5: M=12, N=13, O=14, P=15, Q=16)
const COL_SET_END = 14;   // O
const COL_WINNER = 16;   // Q
const COL_NOTE = 17;     // R
const COL_REFEREE = 19;  // T
const COL_MEDIA = 21;    // V

// Away-team cell values that mean "this team has a bye this round", not a real
// opponent. Explicit allowlist (normalized lowercase) so a typo'd real team name
// still fails the name lookup rather than being silently swallowed as a bye.
const BYE_AWAY_TOKENS = new Set(["n/a", "na", "by round", "(by round)", "bye"]);

// Parses the raw "a-b" cell into its two numbers, in the order written. Orientation into
// home/away happens later, once the cell color is known.
function parseSetScore(
    cell: string,
    setNumber: number,
    rowNumber: number,
    errors: SyncError[]
): { setNumber: number; first: number; second: number } | null {
    const parts = cell.trim().split('-');
    if (parts.length !== 2) {
        errors.push({row: rowNumber, message: `Set ${setNumber}: invalid score format "${cell}" (expected xx-xx)`});
        return null;
    }
    const first = parseInt(parts[0], 10);
    const second = parseInt(parts[1], 10);
    if (isNaN(first) || isNaN(second)) {
        errors.push({row: rowNumber, message: `Set ${setNumber}: non-numeric score "${cell}"`});
        return null;
    }
    return {setNumber, first, second};
}

// Which team won the match, read from the two team-name cell colors. Green name = won,
// red name = lost. Returns null when the colors are absent, contradictory, or inconclusive —
// in which case the caller keeps the positional home-away order.
function resolveMatchWinnerSide(
    homeColor: string | null,
    awayColor: string | null
): 'home' | 'away' | null {
    const homeStatus = classifyWinLossColor(homeColor);
    const awayStatus = classifyWinLossColor(awayColor);
    const homeWon = homeStatus === 'win' || awayStatus === 'loss';
    const awayWon = awayStatus === 'win' || homeStatus === 'loss';
    if (homeWon && !awayWon) return 'home';
    if (awayWon && !homeWon) return 'away';
    return null;
}

// Turns the two raw set numbers into home/away scores using the set cell's color plus the
// known match winner. Green set = won by the match winner, red = won by the match loser; the
// set winner always holds the higher score. Falls back to positional order when we can't tell.
function orientSetScore(
    first: number,
    second: number,
    setColor: string | null,
    matchWinnerSide: 'home' | 'away' | null
): { homeScore: number; awayScore: number } {
    const setStatus = classifyWinLossColor(setColor);
    if (matchWinnerSide === null || setStatus === null || first === second) {
        return {homeScore: first, awayScore: second};
    }
    const loserSide = matchWinnerSide === 'home' ? 'away' : 'home';
    const setWinnerSide = setStatus === 'win' ? matchWinnerSide : loserSide;
    const hi = Math.max(first, second);
    const lo = Math.min(first, second);
    return setWinnerSide === 'home'
        ? {homeScore: hi, awayScore: lo}
        : {homeScore: lo, awayScore: hi};
}

export function parseQualifierRows(
    rows: string[][],
    fgColors: (string | null)[][] | undefined,
    headerRow: number,
): { results: ParsedMatchResult[]; errors: SyncError[] } {
    const results: ParsedMatchResult[] = [];
    const errors: SyncError[] = [];

    // Data starts at headerRow (0-indexed), since header is at headerRow - 1
    const dataStartIndex = headerRow;

    for (let i = dataStartIndex; i < rows.length; i++) {
        const row = rows[i];
        logger.debug({row:row, message: "Row debug"});
        const rowNumber = i + 1;

        const code = row[COL_CODE]?.trim() ?? '';
        if (!code) continue;

        const homeTeamName = normalizeTeamName(row[COL_HOME] ?? '');
        const awayTeamName = normalizeTeamName(row[COL_AWAY] ?? '');

        if (!homeTeamName) continue;

        const isByeAway = BYE_AWAY_TOKENS.has(teamNameKey(awayTeamName));

        if (!awayTeamName) {
            errors.push({row: rowNumber, message: `Row ${rowNumber}: missing away team name`});
            continue;
        }

        const scheduleRaw = row[COL_SCHEDULE]?.trim() || null;
        const winnerRaw = row[COL_WINNER]?.trim() || null;
        const noteRaw = row[COL_NOTE]?.trim() ?? '';
        let isForfeit = noteRaw.toUpperCase() === 'FF';
        const referees = (row[COL_REFEREE]?.trim() || '').split('/').map(s => s.trim()).filter(Boolean);
        const media = (row[COL_MEDIA]?.trim() || '').split('/').map(s => s.trim()).filter(Boolean);

        const rowColors = fgColors?.[i];
        const matchWinnerSide = resolveMatchWinnerSide(
            rowColors?.[COL_HOME] ?? null,
            rowColors?.[COL_AWAY] ?? null,
        );

        const sets: { setNumber: number; homeScore: number; awayScore: number }[] = [];
        let hasParseError = false;

        if (!isForfeit) {
            for (let col = COL_SET_START; col <= COL_SET_END; col++) {
                const cell = row[col]?.trim() ?? '';
                if (!cell) continue;
                if (cell.toLowerCase() === 'xx') continue;
                if (cell.toUpperCase() === 'FF') {
                    isForfeit = true;
                    sets.length = 0;
                    break;
                }
                const setNumber = col - COL_SET_START + 1;
                const parsed = parseSetScore(cell, setNumber, rowNumber, errors);
                if (!parsed) {
                    hasParseError = true;
                    break;
                }
                const {homeScore, awayScore} = orientSetScore(
                    parsed.first,
                    parsed.second,
                    rowColors?.[col] ?? null,
                    matchWinnerSide,
                );
                sets.push({setNumber: parsed.setNumber, homeScore, awayScore});
            }
        }

        if (hasParseError) continue;

        results.push({
            matchCode: code,
            homeTeamName,
            awayTeamName,
            sets,
            winner: winnerRaw,
            isForfeit,
            isByeAway,
            scheduleRaw,
            referees,
            media,
            rowNumber,
        });
    }

    return {results, errors};
}
