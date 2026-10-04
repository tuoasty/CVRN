import {describe, expect, it} from 'vitest';
import {RegionSpecState, RegionState} from '../catalogState';
import {
    addRequirement,
    applyDraftEdit,
    buildSavePayload,
    countSpecChanges,
    parseThresholdInput,
    removeRequirement,
    replaceRequirementStat,
    setRequirementTier,
    setRequirementValue,
    setSecondaryRequired,
    summarizeDraft,
} from '../regionDraft';

const leon: RegionSpecState = {
    requirements: [
        {statKey: 'kills_per_set', tier: 'main', minValue: 6.5},
        {statKey: 'hit_eff', tier: 'main', minValue: 0.32},
        {statKey: 'aces_per_set', tier: 'secondary', minValue: 0.4},
        {statKey: 'receives_per_set', tier: 'secondary', minValue: null},
    ],
    secondaryRequired: 1,
};

const baseline: RegionState = {leon, lima: {requirements: [], secondaryRequired: 0}};

describe('countSpecChanges', () => {
    it('counts each add, removal, tier move, value change and need change once', () => {
        let next = setRequirementTier('hit_eff', 'secondary')(leon);
        next = setRequirementValue('kills_per_set', 7)(next);
        next = removeRequirement('receives_per_set')(next);
        next = addRequirement('digs_per_set', 'secondary')(next);
        next = setSecondaryRequired(2)(next);
        expect(countSpecChanges(leon, next)).toBe(5);
    });

    it('treats a missing baseline as empty', () => {
        expect(countSpecChanges(undefined, addRequirement('kills_per_set', 'main')({requirements: [], secondaryRequired: 0}))).toBe(1);
    });

    it('ignores row order', () => {
        expect(countSpecChanges(leon, {...leon, requirements: [...leon.requirements].reverse()})).toBe(0);
    });
});

describe('setRequirementTier', () => {
    it('moves the row to the end so it lands at the bottom of the other band', () => {
        const next = setRequirementTier('kills_per_set', 'secondary')(leon);
        expect(next.requirements.at(-1)).toEqual({statKey: 'kills_per_set', tier: 'secondary', minValue: 6.5});
    });
});

describe('replaceRequirementStat', () => {
    it('swaps the stat and clears the threshold, refusing a stat already in use', () => {
        expect(replaceRequirementStat('hit_eff', 'digs_per_set')(leon).requirements[1]).toEqual({
            statKey: 'digs_per_set',
            tier: 'main',
            minValue: null,
        });
        expect(replaceRequirementStat('hit_eff', 'aces_per_set')(leon)).toBe(leon);
    });
});

describe('applyDraftEdit', () => {
    it('drops the spec from the draft once it matches the baseline again', () => {
        const moved = applyDraftEdit(baseline, {}, 'leon', setRequirementTier('hit_eff', 'secondary'));
        expect(Object.keys(moved)).toEqual(['leon']);
        const back = applyDraftEdit(baseline, moved, 'leon', setRequirementTier('hit_eff', 'main'));
        expect(back).toEqual({});
    });

    it('starts from the baseline, or empty for a spec with no region state', () => {
        const draft = applyDraftEdit(baseline, {}, 'new', addRequirement('kills_per_set', 'main'));
        expect(draft.new.requirements).toHaveLength(1);
    });
});

describe('summarizeDraft', () => {
    it('totals changes, touched specs, unset values and secondary overflow', () => {
        let draft = applyDraftEdit(baseline, {}, 'leon', setRequirementTier('aces_per_set', 'main'));
        draft = applyDraftEdit(baseline, draft, 'lima', addRequirement('kills_per_set', 'main'));
        expect(summarizeDraft(baseline, draft)).toEqual({
            changes: 2,
            specs: 2,
            unset: 2,
            overflowSpecIds: [],
        });
        draft = applyDraftEdit(baseline, draft, 'leon', setRequirementTier('receives_per_set', 'main'));
        expect(summarizeDraft(baseline, draft).overflowSpecIds).toEqual(['leon']);
    });
});

describe('buildSavePayload', () => {
    it('sends every dirty spec with its full requirement list', () => {
        const draft = applyDraftEdit(baseline, {}, 'leon', setRequirementValue('hit_eff', 0.3));
        const payload = buildSavePayload('na', baseline, draft);
        expect(payload.regionId).toBe('na');
        expect(payload.specs).toHaveLength(1);
        expect(payload.specs[0].specId).toBe('leon');
        expect(payload.specs[0].requirements).toHaveLength(4);
        expect(payload.specs[0].requirements[1]).toEqual({tier: 'main', statKey: 'hit_eff', minValue: 0.3});
    });
});

describe('parseThresholdInput', () => {
    it('reads blank as unset and rejects non-numbers', () => {
        expect(parseThresholdInput('  ')).toBeNull();
        expect(parseThresholdInput('6.5')).toBe(6.5);
        expect(parseThresholdInput('abc')).toBe('invalid');
    });
});
