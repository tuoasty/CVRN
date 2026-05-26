import { ParsedStatLine, SyncError } from "../types";
import { buildHeaderMap, normalizeHeader } from "./statHeaders";
import { parsePlayerMatchStat } from "./parsePlayerMatchStat";

const TEAM_COL = 0; // column A

// Normalized labels in col A that aren't team names and aren't players.
const SKIP_LABELS = new Set(["team totals", "players", "score:"]);

// teamNames keys come from resolveTeamNames (`.toLowerCase().trim()`),
// so team-name comparisons must use the same fold — NOT normalizeHeader
// (which also collapses internal whitespace).
function foldTeamName(s: string): string {
  return s.toLowerCase().trim();
}

export function parseMatchSet(
  rows: string[][],
  teamNames: Set<string>,
  setNumber: number
): { lines: ParsedStatLine[]; errors: SyncError[] } {
  const lines: ParsedStatLine[] = [];
  const errors: SyncError[] = [];

  const header = buildHeaderMap(rows);
  if (!header) {
    errors.push({ row: 0, message: "No stat header row found in tab" });
    return { lines, errors };
  }
  if (header.missing.length > 0) {
    errors.push({
      row: header.headerRowIdx + 1,
      message: `Missing stat columns: ${header.missing.join(", ")}`,
    });
    return { lines, errors };
  }

  let currentTeam: string | null = null;

  for (let r = header.headerRowIdx + 1; r < rows.length; r++) {
    const label = (rows[r]?.[TEAM_COL] ?? "").trim();

    // Blank row in col A closes the current team section.
    if (label === "") {
      currentTeam = null;
      continue;
    }

    if (SKIP_LABELS.has(normalizeHeader(label))) continue;

    const folded = foldTeamName(label);
    if (teamNames.has(folded)) {
      currentTeam = folded;
      continue;
    }

    if (!currentTeam) {
      errors.push({
        row: r + 1,
        message: `Player "${label}" appeared before any team section`,
      });
      continue;
    }

    const result = parsePlayerMatchStat(rows[r], header.colMap);
    if (!result.ok) {
      errors.push({ row: r + 1, message: `[${label}] ${result.error}` });
      continue;
    }

    lines.push({
      username: label,
      teamName: currentTeam,
      rowNumber: r + 1,
      setNumber,
      counts: result.counts,
    });
  }

  return { lines, errors };
}
