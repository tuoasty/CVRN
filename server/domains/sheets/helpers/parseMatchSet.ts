import { ParsedStatLine, SyncError } from "../types";
import { buildHeaderMap, normalizeHeader } from "./statHeaders";
import { parsePlayerMatchStat } from "./parsePlayerMatchStat";

const TEAM_COL = 0; // column A

// Normalized labels in col A that aren't team names and aren't players.
const SKIP_LABELS = new Set(["team totals", "players", "score:"]);

// Unfilled roster slots from the sheet template. Bounded to 1-18 (PLAYER_ROWS
// in parseTeamsSheet.ts) and requires whitespace, so it can't collide with a
// real Roblox username (Roblox disallows spaces).
const PLACEHOLDER_PLAYER_PATTERN = /^player\s+([1-9]|1[0-8])$/i;

// Unrenamed team header from the sheet template. "Like" match — anchored to
// the start as "TEAM <digit>", anything after. Covers all observed variants:
//   "TEAM 1 NAME AND COLOR"     (top roster, untouched template)
//   "TEAM 2 NAME AND COLOR:"    (trailing colon variant)
//   "TEAM 1" / "TEAM 2"         (bottom combined-totals section)
// teamNames (DB) is checked first below, so a real team literally named
// "Team N ..." still resolves correctly.
const PLACEHOLDER_TEAM_PATTERN = /^team\s+\d+\b/i;

const SKIP_SECTION = "__skip_section__" as const;

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

  let currentTeam: string | typeof SKIP_SECTION | null = null;

  for (let r = header.headerRowIdx + 1; r < rows.length; r++) {
    const label = (rows[r]?.[TEAM_COL] ?? "").trim();

    // Blank row in col A closes the current team section.
    if (label === "") {
      currentTeam = null;
      continue;
    }

    if (SKIP_LABELS.has(normalizeHeader(label))) continue;

    // Real DB team match takes precedence over the placeholder regex below,
    // in case any team is literally named "Team N".
    const folded = foldTeamName(label);
    if (teamNames.has(folded)) {
      currentTeam = folded;
      continue;
    }

    // Placeholder team header — silently ignore the entire section.
    if (PLACEHOLDER_TEAM_PATTERN.test(label)) {
      currentTeam = SKIP_SECTION;
      continue;
    }

    // Unfilled roster slot — never represents real data.
    if (PLACEHOLDER_PLAYER_PATTERN.test(label)) continue;

    // Real player under an unrenamed team header — typo guard against silent
    // misattribution. Surface a clear message instead of the generic
    // "appeared before any team section".
    if (currentTeam === SKIP_SECTION) {
      errors.push({
        row: r + 1,
        message: `Player "${label}" is under an unrenamed team header ("TEAM N NAME AND COLOR") — rename the team in the sheet.`,
      });
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
