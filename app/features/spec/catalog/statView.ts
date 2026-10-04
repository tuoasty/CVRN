import {SPEC_STAT_KEYS} from '@/server/domains/spec/types';
import {RegionState} from './catalogState';

export interface StatCoverage {
    statKey: string;
    used: number;
    unset: number;
}

const CATALOG_RANK = new Map(SPEC_STAT_KEYS.map((m, i) => [m.key as string, i]));
const rankOf = (statKey: string) => CATALOG_RANK.get(statKey) ?? SPEC_STAT_KEYS.length;

export function statCoverage(specIds: string[], state: RegionState): StatCoverage[] {
    const byStat = new Map<string, StatCoverage>();
    for (const id of specIds) {
        for (const r of state[id]?.requirements ?? []) {
            const entry = byStat.get(r.statKey) ?? {statKey: r.statKey, used: 0, unset: 0};
            entry.used++;
            if (r.minValue === null) entry.unset++;
            byStat.set(r.statKey, entry);
        }
    }
    return [...byStat.values()].sort((a, b) => rankOf(a.statKey) - rankOf(b.statKey) || a.statKey.localeCompare(b.statKey));
}

export interface OrderCheckRow {
    specId: string;
    name: string;
    stars: number;
    value: number | null;
}

export interface OrderCheckFlag {
    name: string;
    stars: number;
    value: number;
}

export function orderCheckFlags(rows: OrderCheckRow[], lowerIsBetter: boolean): Record<string, OrderCheckFlag> {
    const harder = (a: number, b: number) => (lowerIsBetter ? a < b : a > b);
    const flags: Record<string, OrderCheckFlag> = {};
    for (const row of rows) {
        if (row.value === null) continue;
        let worst: OrderCheckRow | null = null;
        for (const other of rows) {
            if (other.value === null || other.stars <= row.stars) continue;
            if (!harder(row.value, other.value)) continue;
            if (!worst || harder(worst.value as number, other.value)) worst = other;
        }
        if (worst) flags[row.specId] = {name: worst.name, stars: worst.stars, value: worst.value as number};
    }
    return flags;
}
