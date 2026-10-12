import {POSITIONS, normalizePositionInput} from "@/shared/volleyball/positions";

interface SpecLike {
    name: string;
    position: string;
    stars: number;
}

export interface SpecGroup<T> {
    key: string;
    label: string;
    items: T[];
}

export function groupBySpecPosition<T>(items: readonly T[], specOf: (item: T) => SpecLike): SpecGroup<T>[] {
    const groups = new Map<string, SpecGroup<T>>();
    for (const item of items) {
        const raw = specOf(item).position;
        const code = normalizePositionInput(raw);
        const key = code ?? raw;
        const label = POSITIONS.find(p => p.code === code)?.label ?? raw;
        const group = groups.get(key) ?? {key, label, items: []};
        group.items.push(item);
        groups.set(key, group);
    }
    const rank = (key: string) => {
        const i = POSITIONS.findIndex(p => p.code === key);
        return i < 0 ? POSITIONS.length : i;
    };
    const byStarsThenName = (a: T, b: T) => {
        const sa = specOf(a);
        const sb = specOf(b);
        return sb.stars - sa.stars || sa.name.localeCompare(sb.name);
    };
    return [...groups.values()]
        .sort((a, b) => rank(a.key) - rank(b.key) || a.label.localeCompare(b.label))
        .map(g => ({...g, items: [...g.items].sort(byStarsThenName)}));
}
