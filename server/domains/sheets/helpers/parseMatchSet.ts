import { ParsedSection, StatCounts, SyncError } from "../types";
import { buildHeaderMap, normalizeHeader } from "./statHeaders";
import { parsePlayerMatchStat } from "./parsePlayerMatchStat";

const TEAM_COL = 0; 

const DATA_END_LABEL = "team totals";
const SKIP_LABELS = new Set(["players", "score:"]);

const PLACEHOLDER_PLAYER_PATTERN = /^player\s+([1-9]|1[0-8])$/i;

function hasAnyStatValue(
  row: string[],
  colMap: Map<keyof StatCounts, number>
): boolean {
  for (const colIdx of colMap.values()) {
    if ((row[colIdx] ?? "").trim() !== "") return true;
  }
  return false;
}

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

    if (label === "") continue;

    const norm = normalizeHeader(label);

    if (norm === DATA_END_LABEL) break;
    if (SKIP_LABELS.has(norm)) continue;
    if (PLACEHOLDER_PLAYER_PATTERN.test(label)) continue;

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
