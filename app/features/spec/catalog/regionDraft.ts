import {SaveRegionRequirementsInput, SpecRequirementInput, SpecTier} from '@/server/domains/spec/types';
import {DraftRequirement, RegionSpecState, RegionState} from './catalogState';

export const EMPTY_SPEC_STATE: RegionSpecState = {requirements: [], secondaryRequired: 0};

export type SpecStateEdit = (state: RegionSpecState) => RegionSpecState;

export const secondaryCount = (state: RegionSpecState): number =>
    state.requirements.filter(r => r.tier === 'secondary').length;

export const hasSecondaryOverflow = (state: RegionSpecState): boolean =>
    state.secondaryRequired > secondaryCount(state);

export const unsetCount = (state: RegionSpecState): number =>
    state.requirements.filter(r => r.minValue === null).length;

function byStat(reqs: DraftRequirement[]): Map<string, DraftRequirement> {
    return new Map(reqs.map(r => [r.statKey, r]));
}

export function countSpecChanges(base: RegionSpecState | undefined, next: RegionSpecState): number {
    const before = base ?? EMPTY_SPEC_STATE;
    let changes = before.secondaryRequired === next.secondaryRequired ? 0 : 1;
    const beforeByStat = byStat(before.requirements);
    const nextByStat = byStat(next.requirements);
    for (const r of next.requirements) {
        const b = beforeByStat.get(r.statKey);
        if (!b) {
            changes++;
            continue;
        }
        if (b.tier !== r.tier) changes++;
        if (b.minValue !== r.minValue) changes++;
    }
    for (const r of before.requirements) if (!nextByStat.has(r.statKey)) changes++;
    return changes;
}

export const sameSpecState = (base: RegionSpecState | undefined, next: RegionSpecState): boolean =>
    countSpecChanges(base, next) === 0;

export function applyDraftEdit(
    baseline: RegionState,
    draft: RegionState,
    specId: string,
    edit: SpecStateEdit
): RegionState {
    const current = draft[specId] ?? baseline[specId] ?? EMPTY_SPEC_STATE;
    const next = edit(current);
    const rest = {...draft};
    delete rest[specId];
    return sameSpecState(baseline[specId], next) ? rest : {...rest, [specId]: next};
}

export const effectiveSpecState = (baseline: RegionState, draft: RegionState, specId: string): RegionSpecState =>
    draft[specId] ?? baseline[specId] ?? EMPTY_SPEC_STATE;

export function dirtySpecIds(baseline: RegionState, draft: RegionState): string[] {
    return Object.keys(draft).filter(id => !sameSpecState(baseline[id], draft[id]));
}

export interface DraftSummary {
    changes: number;
    specs: number;
    unset: number;
    overflowSpecIds: string[];
}

export function summarizeDraft(baseline: RegionState, draft: RegionState): DraftSummary {
    const summary: DraftSummary = {changes: 0, specs: 0, unset: 0, overflowSpecIds: []};
    for (const id of dirtySpecIds(baseline, draft)) {
        const state = draft[id];
        summary.changes += countSpecChanges(baseline[id], state);
        summary.specs++;
        summary.unset += unsetCount(state);
        if (hasSecondaryOverflow(state)) summary.overflowSpecIds.push(id);
    }
    return summary;
}

export function buildSavePayload(regionId: string, baseline: RegionState, draft: RegionState): SaveRegionRequirementsInput {
    return {
        regionId,
        specs: dirtySpecIds(baseline, draft).map(specId => ({
            specId,
            secondaryRequired: draft[specId].secondaryRequired,
            requirements: draft[specId].requirements.map(({tier, statKey, minValue}) => ({
                tier,
                statKey: statKey as SpecRequirementInput['statKey'],
                minValue,
            })),
        })),
    };
}

export const setRequirementTier =
    (statKey: string, tier: SpecTier): SpecStateEdit =>
    state => {
        const req = state.requirements.find(r => r.statKey === statKey);
        if (!req || req.tier === tier) return state;
        return {
            ...state,
            requirements: [...state.requirements.filter(r => r.statKey !== statKey), {...req, tier}],
        };
    };

export const setRequirementValue =
    (statKey: string, minValue: number | null): SpecStateEdit =>
    state => ({
        ...state,
        requirements: state.requirements.map(r => (r.statKey === statKey ? {...r, minValue} : r)),
    });

export const removeRequirement =
    (statKey: string): SpecStateEdit =>
    state => ({...state, requirements: state.requirements.filter(r => r.statKey !== statKey)});

export const addRequirement =
    (statKey: string, tier: SpecTier): SpecStateEdit =>
    state =>
        state.requirements.some(r => r.statKey === statKey)
            ? state
            : {...state, requirements: [...state.requirements, {statKey, tier, minValue: null}]};

export const replaceRequirementStat =
    (fromKey: string, toKey: string): SpecStateEdit =>
    state =>
        fromKey === toKey || state.requirements.some(r => r.statKey === toKey)
            ? state
            : {
                  ...state,
                  requirements: state.requirements.map(r =>
                      r.statKey === fromKey ? {...r, statKey: toKey} : r
                  ),
              };

export const setSecondaryRequired =
    (secondaryRequired: number): SpecStateEdit =>
    state => ({...state, secondaryRequired});

export function parseThresholdInput(text: string): number | null | 'invalid' {
    const trimmed = text.trim();
    if (trimmed === '') return null;
    const value = Number(trimmed);
    return Number.isFinite(value) ? value : 'invalid';
}
