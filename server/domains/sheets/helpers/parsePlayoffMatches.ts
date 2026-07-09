import { ParsedPlayoffResult, SyncError } from "../types";
import { parseOfficialsCell } from "./parseOfficialsCell";

// Cell layout, relative to the anchor cell holding the match code at [row][col]:
//
//   [row-1][col]              schedule  ("Date: ...")
//   [row  ][col]  = ANCHOR    match code
//   [row  ][col+1]            home team name
//   [row+1][col+1]            away team name
//   [row  ][col+5..col+9]     home set scores (up to 5, BO5)
//   [row+1][col+5..col+9]     away set scores
//   [row+2][col]              "REFS: a, b"
//   [row+3][col]              "MEDIA: a, b"
//
// The sheet is externally owned, so every read tolerates a missing row or column:
// Google returns jagged rows, and a merged range only carries its value in the
// top-left cell.

const SET_COL_OFFSET = 5;
const MAX_SETS = 5;

function cell(rows: string[][], row: number, col: number): string {
    if (row < 0) return '';
    return rows[row]?.[col]?.trim() ?? '';
}

function isForfeitToken(value: string): boolean {
    return value.toUpperCase() === 'FF';
}

// A forfeit written as scores rather than an FF token: every set is a shutout for
// the same side (25-0, or 15-0 for a BO5 fifth set). A genuine shutout set is
// legal volleyball but effectively never happens, and the sheet uses this form
// interchangeably with "FF".
function isForfeitScoreline(sets: { homeScore: number; awayScore: number }[]): 'home' | 'away' | null {
    if (sets.length === 0) return null;
    if (sets.every(s => s.awayScore === 0 && s.homeScore > 0)) return 'away';
    if (sets.every(s => s.homeScore === 0 && s.awayScore > 0)) return 'home';
    return null;
}

export function parsePlayoffMatches(
  rows: string[][],
  knownCodes: Set<string>
): { results: ParsedPlayoffResult[]; errors: SyncError[] } {
  const results: ParsedPlayoffResult[] = [];
  const errors: SyncError[] = [];

  const normalizedCodes = new Set([...knownCodes].map(code => code.toUpperCase()));
  const seenAt = new Map<string, { row: number; col: number }>();

  for (let row = 0; row < rows.length; row++) {
    const currentRow = rows[row];
    if (!currentRow) continue;

    for (let col = 0; col < currentRow.length; col++) {
      const raw = currentRow[col]?.trim();
      if (!raw) continue;

      const code = raw.toUpperCase();
      if (!normalizedCodes.has(code)) continue;

      const rowNumber = row + 1;

      const previous = seenAt.get(code);
      if (previous) {
        errors.push({
          row: rowNumber,
          message: `[${code}] Duplicate match code — already found at row ${previous.row + 1}, col ${previous.col + 1}`,
        });
        continue;
      }
      seenAt.set(code, { row, col });

      const homeTeamName = cell(rows, row, col + 1);
      const awayTeamName = cell(rows, row + 1, col + 1);

      if (!homeTeamName || !awayTeamName) continue;

      const scheduleRaw = cell(rows, row - 1, col) || null;
      const referees = parseOfficialsCell(cell(rows, row + 2, col), 'REFS');
      const media = parseOfficialsCell(cell(rows, row + 3, col), 'MEDIA');

      const sets: { setNumber: number; homeScore: number; awayScore: number }[] = [];
      let isForfeit = false;
      let forfeitingTeam: 'home' | 'away' | null = null;
      let hasParseError = false;

      for (let setCol = col + SET_COL_OFFSET; setCol < col + SET_COL_OFFSET + MAX_SETS; setCol++) {
        const homeCell = cell(rows, row, setCol);
        const awayCell = cell(rows, row + 1, setCol);

        if (!homeCell && !awayCell) break;

        const homeIsFF = isForfeitToken(homeCell);
        const awayIsFF = isForfeitToken(awayCell);
        if (homeIsFF && awayIsFF) {
          errors.push({ row: rowNumber, message: `[${code}] Both teams marked FF` });
          hasParseError = true;
          break;
        }
        if (homeIsFF || awayIsFF) {
          isForfeit = true;
          forfeitingTeam = homeIsFF ? 'home' : 'away';
          sets.length = 0; // scores are regenerated from best_of downstream
          break;
        }

        if (!homeCell || !awayCell) {
          const missing = homeCell ? 'away' : 'home';
          errors.push({
            row: rowNumber,
            message: `[${code}] Set at col ${setCol + 1}: ${missing} score is missing`,
          });
          hasParseError = true;
          break;
        }

        const homeScore = parseInt(homeCell, 10);
        const awayScore = parseInt(awayCell, 10);
        if (isNaN(homeScore) || isNaN(awayScore)) {
          errors.push({
            row: rowNumber,
            message: `[${code}] Set at col ${setCol + 1}: non-numeric score "${homeCell}"-"${awayCell}"`,
          });
          hasParseError = true;
          break;
        }

        sets.push({
          setNumber: setCol - (col + SET_COL_OFFSET) + 1,
          homeScore,
          awayScore,
        });
      }

      if (hasParseError) continue;

      if (!isForfeit) {
        forfeitingTeam = isForfeitScoreline(sets);
        if (forfeitingTeam) {
          isForfeit = true;
          sets.length = 0;
        }
      }

      let winner: string | null = null;
      if (isForfeit && forfeitingTeam) {
        winner = forfeitingTeam === 'home' ? awayTeamName : homeTeamName;
      } else if (sets.length > 0) {
        // Mirrors validateAndCalculateMatchResult's set-win rule, including its
        // draw-goes-to-away convention.
        const homeSetsWon = sets.filter(s => s.homeScore > s.awayScore).length;
        winner = homeSetsWon > sets.length - homeSetsWon ? homeTeamName : awayTeamName;
      }

      results.push({
        matchCode: code,
        homeTeamName,
        awayTeamName,
        sets,
        winner,
        isForfeit,
        scheduleRaw,
        referees,
        media,
        rowNumber,
      });
    }
  }

  return { results, errors };
}
