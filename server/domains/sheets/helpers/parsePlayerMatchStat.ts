import { StatCounts } from "../types";
import { STAT_KEYS, OPTIONAL_STAT_KEYS } from "./statHeaders";

export type ParsePlayerStatResult =
  | { ok: true; counts: StatCounts }
  | { ok: false; error: string };

export function parsePlayerMatchStat(
  row: string[],
  colMap: Map<keyof StatCounts, number>
): ParsePlayerStatResult {
  const counts = {} as StatCounts;

  for (const key of STAT_KEYS) {
    const colIdx = colMap.get(key);
    if (colIdx === undefined) {
      if (OPTIONAL_STAT_KEYS.has(key)) {
        counts[key] = 0;
        continue;
      }
      return { ok: false, error: `missing column for "${key}"` };
    }

    const raw = (row[colIdx] ?? "").trim();
    if (raw === "") {
      counts[key] = 0;
      continue;
    }

    const n = Number(raw);
    if (!Number.isInteger(n) || n < 0) {
      return { ok: false, error: `non-integer "${key}": "${raw}"` };
    }
    counts[key] = n;
  }

  return { ok: true, counts };
}
