import {ParsedMatchResult, SyncError} from "@/server/domains/sheets/types";
import {logger} from "@/server/utils/logger";

const COL_CODE = 4;      // E
const COL_HOME = 6;      // G
const COL_AWAY = 8;      // I
const COL_SCHEDULE = 10; // K
const COL_SET_START = 12; // M (Sets 1-5: M=12, N=13, O=14, P=15, Q=16)
const COL_SET_END = 16;   // Q
const COL_WINNER = 18;   // S
const COL_NOTE = 19;     // T
const COL_REFEREE = 21;  // V
const COL_MEDIA = 23;    // X

function parseSetScore(
    cell: string,
    setNumber: number,
    rowNumber: number,
    errors: SyncError[]
): { setNumber: number; homeScore: number; awayScore: number } | null {
    const parts = cell.trim().split('-');
    if (parts.length !== 2) {
        errors.push({row: rowNumber, message: `Set ${setNumber}: invalid score format "${cell}" (expected xx-xx)`});
        return null;
    }
    const home = parseInt(parts[0], 10);
    const away = parseInt(parts[1], 10);
    if (isNaN(home) || isNaN(away)) {
        errors.push({row: rowNumber, message: `Set ${setNumber}: non-numeric score "${cell}"`});
        return null;
    }
    return {setNumber, homeScore: home, awayScore: away};
}

export function parseQualifierRows(
    rows: string[][],
    headerRow: number
): { results: ParsedMatchResult[]; errors: SyncError[] } {
    const results: ParsedMatchResult[] = [];
    const errors: SyncError[] = [];

    // Data starts at headerRow (0-indexed), since header is at headerRow - 1
    const dataStartIndex = headerRow;

    for (let i = dataStartIndex; i < rows.length; i++) {
        const row = rows[i];
        logger.debug({row:row, message: "Row debug"});
        const rowNumber = i + 1; // 1-indexed for error messages

        const rawCode = row[COL_CODE]?.trim() ?? '';
        if (!rawCode) continue; // empty code = skip row

        // Sheet format is `{week}-{n}` (e.g. `1-1`); canonical DB format is
        // `W{week}-M{n}`. Promote on write so the column stays consistent
        // with the backfill output. Anything that doesn't match the bare
        // numeric form passes through unchanged.
        const numericMatch = rawCode.match(/^(\d+)-(\d+)$/);
        const code = numericMatch ? `W${numericMatch[1]}-M${numericMatch[2]}` : rawCode;

        const homeTeamName = row[COL_HOME]?.trim() ?? '';
        const awayTeamName = row[COL_AWAY]?.trim() ?? '';

        if (!homeTeamName) continue; // row not filled yet
        if (!awayTeamName) {
            errors.push({row: rowNumber, message: `Row ${rowNumber}: missing away team name`});
            continue;
        }

        const scheduleRaw = row[COL_SCHEDULE]?.trim() || null;
        const winnerRaw = row[COL_WINNER]?.trim() || null;
        const noteRaw = row[COL_NOTE]?.trim() ?? '';
        const isForfeit = noteRaw.toUpperCase() === 'FF';
        const referees = (row[COL_REFEREE]?.trim() || '').split('/').map(s => s.trim()).filter(Boolean);
        const media = (row[COL_MEDIA]?.trim() || '').split('/').map(s => s.trim()).filter(Boolean);

        const sets: { setNumber: number; homeScore: number; awayScore: number }[] = [];
        let hasParseError = false;

        if (!isForfeit) {
            for (let col = COL_SET_START; col <= COL_SET_END; col++) {
                const cell = row[col]?.trim() ?? '';
                if (!cell) continue;
                if (cell.toLowerCase() === 'xx') continue; // default placeholder, skip
                const setNumber = col - COL_SET_START + 1;
                const parsed = parseSetScore(cell, setNumber, rowNumber, errors);
                if (!parsed) {
                    hasParseError = true;
                    break;
                }
                sets.push(parsed);
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
            scheduleRaw,
            referees,
            media,
            rowNumber,
        });
    }

    return {results, errors};
}
