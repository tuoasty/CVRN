import { ParsedSection, StatCounts, SyncError } from "../types";
import { buildHeaderMap, normalizeHeader } from "./statHeaders";
import { parsePlayerMatchStat } from "./parsePlayerMatchStat";

const TEAM_COL = 0; // column A

// "Team Totals" heads the aggregate block at the bottom of the tab. Everything
// below it is per-team totals — rows that carry a team name in column A AND real
// stat values, so they are indistinguishable from player rows. It ends the data,
// not just the current section.
// "score:" and "players" sit inside a section and must not close it.
const DATA_END_LABEL = "team totals";
const SKIP_LABELS = new Set(["players", "score:"]);

// Unfilled roster slots from the sheet template. Bounded to 1-18 (PLAYER_ROWS
// in parseTeamsSheet.ts) and requires whitespace, so it can't collide with a
// real Roblox username (Roblox disallows spaces).
const PLACEHOLDER_PLAYER_PATTERN = /^player\s+([1-9]|1[0-8])$/i;

// A header row carries a label and no stat values; a player row carries at least
// one. This is what separates the two — never the text of the label, which may be
// mistyped in the sheet and cannot be corrected (the sheets are view-only).
function hasAnyStatValue(
  row: string[],
  colMap: Map<keyof StatCounts, number>
): boolean {
  for (const colIdx of colMap.values()) {
    if ((row[colIdx] ?? "").trim() !== "") return true;
  }
  return false;
}

// Structure only. Sections come out in sheet order with their raw header text;
// deciding which team each one belongs to needs the DB and happens in
// buildMatchStatsPlan.
export function parseMatchSet(
  rows: string[][],
  setNumber: number
): { sections: ParsedSection[]; errors: SyncError[] } {
  const sections: ParsedSection[] = [];
  const errors: SyncError[] = [];

  const header = buildHeaderMap(rows);
  if (!header) {
    errors.push({ row: 0, message: "No stat header row found in tab", kind: "fatal" });
    return { sections, errors };
  }
  if (header.missing.length > 0) {
    errors.push({
      row: header.headerRowIdx + 1,
      message: `Missing stat columns: ${header.missing.join(", ")}`,
      kind: "fatal",
    });
    return { sections, errors };
  }

  let current: ParsedSection | null = null;

  for (let r = header.headerRowIdx + 1; r < rows.length; r++) {
    const row = rows[r] ?? [];
    const label = (row[TEAM_COL] ?? "").trim();

    // Blank rows carry no meaning. Spacers, unfilled slots — all ignored.
    if (label === "") continue;

    const norm = normalizeHeader(label);

    if (norm === DATA_END_LABEL) break;
    if (SKIP_LABELS.has(norm)) continue;
    if (PLACEHOLDER_PLAYER_PATTERN.test(label)) continue;

    // No stat values → a section header, whatever it says.
    if (!hasAnyStatValue(row, header.colMap)) {
      current = { sectionIndex: sections.length, headerLabel: label, lines: [] };
      sections.push(current);
      continue;
    }

    if (!current) {
      errors.push({
        row: r + 1,
        message: `Player "${label}" appeared before any team section`,
        kind: "fatal",
      });
      continue;
    }

    const result = parsePlayerMatchStat(row, header.colMap);
    if (!result.ok) {
      errors.push({ row: r + 1, message: `[${label}] ${result.error}`, kind: "fatal" });
      continue;
    }

    current.lines.push({
      username: label,
      rowNumber: r + 1,
      setNumber,
      counts: result.counts,
    });
  }

  return { sections, errors };
}
