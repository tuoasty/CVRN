import {SpecTier, LeagueSpecWithAllRegions} from '@/server/domains/spec/types';

export interface DraftRequirement {
    statKey: string;
    tier: SpecTier;
    minValue: number | null;
}

export interface RegionSpecState {
    requirements: DraftRequirement[];
    secondaryRequired: number;
}

export type RegionState = Record<string, RegionSpecState>;

const TIER_RANK: Record<SpecTier, number> = {main: 0, secondary: 1};

export function buildRegionState(specs: LeagueSpecWithAllRegions[], regionId: string): RegionState {
    const state: RegionState = {};
    for (const spec of specs) {
        const requirements = spec.requirements
            .filter(r => r.region_id === regionId)
            .sort(
                (a, b) =>
                    TIER_RANK[a.tier as SpecTier] - TIER_RANK[b.tier as SpecTier] ||
                    a.created_at.localeCompare(b.created_at) ||
                    a.stat_key.localeCompare(b.stat_key)
            )
            .map(r => ({
                statKey: r.stat_key,
                tier: r.tier as SpecTier,
                minValue: r.min_value === null ? null : Number(r.min_value),
            }));
        const rule = spec.rules.find(r => r.region_id === regionId);
        state[spec.id] = {requirements, secondaryRequired: rule?.secondary_required ?? 0};
    }
    return state;
}

export type SpecListMarker =
    | {kind: 'none'}
    | {kind: 'unset'; count: number}
    | {kind: 'count'; count: number};

export function specListMarker(state: RegionSpecState | undefined): SpecListMarker {
    const reqs = state?.requirements ?? [];
    if (reqs.length === 0) return {kind: 'none'};
    const unset = reqs.filter(r => r.minValue === null).length;
    if (unset > 0) return {kind: 'unset', count: unset};
    return {kind: 'count', count: reqs.length};
}

export interface StarBand<T> {
    stars: number;
    items: T[];
}

export function groupByStars<T extends {stars: number; name: string}>(items: T[]): StarBand<T>[] {
    const byStars = new Map<number, T[]>();
    for (const item of items) {
        const list = byStars.get(item.stars) ?? [];
        list.push(item);
        byStars.set(item.stars, list);
    }
    return [...byStars.entries()]
        .sort(([a], [b]) => b - a)
        .map(([stars, list]) => ({stars, items: [...list].sort((a, b) => a.name.localeCompare(b.name))}));
}

export type ReferenceValue = {kind: 'none'} | {kind: 'unset'} | {kind: 'value'; value: number};

export function referenceValue(state: RegionSpecState | undefined, statKey: string): ReferenceValue {
    const req = state?.requirements.find(r => r.statKey === statKey);
    if (!req) return {kind: 'none'};
    if (req.minValue === null) return {kind: 'unset'};
    return {kind: 'value', value: req.minValue};
}
