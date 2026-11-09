import type {PlayerMatchStatTotal} from "@/shared/types/db";
import type {PositionCode} from "@/shared/volleyball/positions";
import {MATCH_TOTAL_FIELD} from "./leaders";
import type {MatchupCategory, StatCell} from "./types";

type Spec = { label: string; season: string; match: string; pct?: boolean };

const PTS: Spec = {label: "PTS", season: "points_per_set", match: "points"};
const K: Spec = {label: "K", season: "kills_per_set", match: "total_kills"};
const HIT: Spec = {label: "HIT%", season: "hit_eff", match: "hit_eff", pct: true};
const REC: Spec = {label: "REC", season: "receives_per_set", match: "total_receives"};
const BLK: Spec = {label: "BLK", season: "blocks_per_set", match: "total_blocks"};
const ACE: Spec = {label: "ACE", season: "aces_per_set", match: "total_aces"};
const DIG: Spec = {label: "DIG", season: "digs_per_set", match: "digs"};
const AST: Spec = {label: "AST", season: "assists_per_set", match: "assists"};

const POTW_LINES: Record<PositionCode, Spec[]> = {
    SET: [AST, {label: "SET%", season: "set_eff", match: "set_eff", pct: true}, PTS, {label: "APEK", season: "ape_kills_per_set", match: "ape_kills"}, HIT, REC, BLK, ACE],
    OPP: [PTS, K, HIT, {label: "DLK", season: "delay_kills_per_set", match: "delay_kills"}, {label: "QK", season: "quick_kills_per_set", match: "quick_kills"}, REC, BLK, ACE],
    OUT: [PTS, K, HIT, REC, DIG, BLK, ACE],
    MID: [PTS, K, HIT, {label: "KB", season: "kill_blocks_per_set", match: "kill_blocks"}, BLK, {label: "KB%", season: "kb_pct", match: "kb_pct", pct: true}, REC, ACE],
    LIB: [REC, DIG, {label: "DIV", season: "dives_per_set", match: "dives"}, {label: "BT", season: "block_touches_per_set", match: "block_touches"}, AST],
};

const POSITIONS: PositionCode[] = ["SET", "OPP", "OUT", "MID", "LIB"];

export const POSITION_NAMES: Record<PositionCode, string> = {
    SET: "Setter",
    OPP: "Opposite",
    OUT: "Outside",
    MID: "Middle",
    LIB: "Libero",
};

function num(v: unknown): number {
    return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

export function mainPosition(counts: unknown): PositionCode | null {
    if (!counts || typeof counts !== "object") return null;
    const c = counts as Record<string, unknown>;
    let best: PositionCode | null = null;
    for (const p of POSITIONS) {
        if (num(c[p]) > 0 && (best === null || num(c[p]) > num(c[best]))) best = p;
    }
    return best;
}

export function sumPlayerTotals(totals: PlayerMatchStatTotal[], playerId: string): Record<string, number> | null {
    const rows = totals.filter(t => t.player_id === playerId);
    if (rows.length === 0) return null;
    const sum: Record<string, number> = {};
    for (const row of rows) {
        for (const [key, value] of Object.entries(row)) {
            if (typeof value === "number") sum[key] = (sum[key] ?? 0) + value;
        }
    }
    const ratio = (top: number, bottom: number) => (bottom > 0 ? top / bottom : Number.NaN);
    sum.hit_eff = ratio(num(sum.total_kills) - num(sum.spiking_errors), num(sum.total_attempts));
    sum.set_eff = ratio(num(sum.assists), num(sum.assists) + num(sum.setting_errors));
    sum.kb_pct = ratio(num(sum.kill_blocks), num(sum.total_blocks));
    return sum;
}

export function potwLine(position: PositionCode | null, row: Record<string, unknown>, source: "season" | "match"): StatCell[] {
    return POTW_LINES[position ?? "OUT"].map(spec => {
        const raw = row[source === "season" ? spec.season : spec.match];
        const has = typeof raw === "number" && Number.isFinite(raw);
        if (spec.pct) return {label: spec.label, value: has ? `${((raw as number) * 100).toFixed(1)}%` : "-"};
        const value = has ? (raw as number) : 0;
        return source === "season"
            ? {label: `${spec.label}/set`, value: value.toFixed(1)}
            : {label: spec.label, value: String(Math.round(value))};
    });
}

export function roundTeamLeaders(
    totals: PlayerMatchStatTotal[],
    teamId: string,
): Record<MatchupCategory, { playerId: string; value: number; row: Record<string, number> } | null> {
    const ids = [...new Set(totals.filter(t => t.team_id === teamId && t.player_id).map(t => t.player_id as string))];
    const summed = ids.flatMap(id => {
        const row = sumPlayerTotals(totals.filter(t => t.team_id === teamId), id);
        return row ? [{playerId: id, row}] : [];
    });
    const pick = (category: MatchupCategory) => {
        const field = MATCH_TOTAL_FIELD[category];
        const best = summed
            .map(s => ({...s, value: num(s.row[field])}))
            .sort((a, b) => b.value - a.value || a.playerId.localeCompare(b.playerId))[0];
        return best && best.value > 0 ? best : null;
    };
    return {setter: pick("setter"), scorer: pick("scorer"), blocker: pick("blocker"), receiver: pick("receiver")};
}
