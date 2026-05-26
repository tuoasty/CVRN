import { StatCounts } from "../types";

// Lowercase, treat `/` as whitespace, then collapse runs of whitespace to a
// single space. So "Wipes/Tools", "wipes / tools", and a multi-line cell
// "wipes/\ntools" all normalize to "wipes tools".
export function normalizeHeader(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/\//g, " ")
    .replace(/\s+/g, " ");
}

// VERIFY against the live stats sheet before trusting these.
export const STAT_HEADERS: Record<string, keyof StatCounts> = {
  "ape kills": "ape_kills",
  "ape attempts": "ape_attempts",
  "delay kills": "delay_kills",
  "quick kills": "quick_kills",
  "wipes tools": "wipes_tools",
  "attempts": "kill_attempts",
  "spiking errors": "spiking_errors",
  "assist": "assists",
  "setting errors": "setting_errors",
  "kill blocks": "kill_blocks",
  "block touches": "block_touches",
  "serve receives": "serve_receives",
  "digs": "digs",
  "block follows": "block_follows",
  "dives": "dives",
  "aces": "aces",
  "service errors": "service_errors",
  "misc errors": "misc_errors",
};

export const STAT_KEYS = Object.values(STAT_HEADERS);

export function buildHeaderMap(rows: string[][]): {
  headerRowIdx: number;
  colMap: Map<keyof StatCounts, number>;
  missing: (keyof StatCounts)[];
} | null {
  let best = { idx: -1, hits: 0, map: new Map<keyof StatCounts, number>() };

  for (let r = 0; r < rows.length; r++) {
    const map = new Map<keyof StatCounts, number>();
    rows[r].forEach((cell, c) => {
      const key = STAT_HEADERS[normalizeHeader(cell ?? "")];
      if (key && !map.has(key)) map.set(key, c);
    });
    if (map.size > best.hits) best = { idx: r, hits: map.size, map };
  }

  if (best.idx === -1) return null;
  const missing = STAT_KEYS.filter(k => !best.map.has(k));
  return { headerRowIdx: best.idx, colMap: best.map, missing };
}
