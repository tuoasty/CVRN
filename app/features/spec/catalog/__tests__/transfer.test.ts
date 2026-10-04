import {describe, expect, it} from 'vitest';
import {SpecImportRegionDiff, SpecImportSpecDiff} from '@/server/domains/spec/types';
import {
    groupImportIssues,
    importPreviewModel,
    listWithMore,
    summarizeSpecDiff,
    unpublishableSpecNames,
} from '../transfer';

function specDiff(specName: string, status: SpecImportSpecDiff['status'], changes: SpecImportSpecDiff['changes'] = []): SpecImportSpecDiff {
    return {specId: specName, specName, status, secondaryBefore: 0, secondaryAfter: 0, changes, unsetCount: 0};
}

describe('summarizeSpecDiff', () => {
    it('splits changes into added, removed, tier moves and value changes', () => {
        expect(
            summarizeSpecDiff(
                specDiff('Leon', 'changed', [
                    {statKey: 'a', before: null, after: {tier: 'secondary', value: null}},
                    {statKey: 'b', before: {tier: 'secondary', value: 8}, after: null},
                    {statKey: 'c', before: {tier: 'secondary', value: 40}, after: {tier: 'main', value: 38}},
                    {statKey: 'd', before: {tier: 'main', value: 6}, after: {tier: 'main', value: 6.5}},
                ])
            )
        ).toEqual({added: 1, removed: 1, tiers: 1, values: 2});
    });
});

describe('importPreviewModel', () => {
    it('orders cleared, changed, added and splits off unchanged specs', () => {
        const diff: SpecImportRegionDiff = {
            regionId: 'na',
            regionCode: 'NA',
            mode: 'shape',
            specs: [
                specDiff('Zed', 'unchanged'),
                specDiff('Lima', 'added'),
                specDiff('Leon', 'changed'),
                specDiff('Anderson', 'cleared'),
                specDiff('Ishikawa', 'changed'),
            ],
            counts: {added: 1, changed: 2, cleared: 1, unchanged: 1},
            unsetCount: 0,
        };
        const model = importPreviewModel(diff);
        expect(model.replaceCount).toBe(4);
        expect(model.listed.map(s => s.specName)).toEqual(['Anderson', 'Ishikawa', 'Leon', 'Lima']);
        expect(model.unchanged.map(s => s.specName)).toEqual(['Zed']);
    });
});

describe('groupImportIssues', () => {
    it('puts file-level issues first, then groups by spec in order of appearance', () => {
        expect(
            groupImportIssues([
                {spec: 'Leon', message: 'stars mismatch'},
                {spec: null, message: 'bad shape'},
                {spec: 'Tillie', message: 'unknown spec'},
                {spec: 'Leon', message: 'duplicate stat'},
            ])
        ).toEqual([
            {title: 'File', messages: ['bad shape']},
            {title: 'Leon', messages: ['stars mismatch', 'duplicate stat']},
            {title: 'Tillie', messages: ['unknown spec']},
        ]);
    });
});

describe('unpublishableSpecNames', () => {
    it('names specs with requirements that include an unset value', () => {
        const saved = {
            a: {requirements: [{statKey: 'k', tier: 'main' as const, minValue: null}], secondaryRequired: 0},
            b: {requirements: [{statKey: 'k', tier: 'main' as const, minValue: 1}], secondaryRequired: 0},
            c: {requirements: [], secondaryRequired: 0},
        };
        expect(
            unpublishableSpecNames(
                [
                    {id: 'a', name: 'Leon'},
                    {id: 'b', name: 'Lima'},
                    {id: 'c', name: 'Russell'},
                ],
                saved
            )
        ).toEqual(['Leon']);
    });
});

describe('listWithMore', () => {
    it('caps the list and counts the rest', () => {
        expect(listWithMore(['A', 'B'])).toBe('A, B');
        expect(listWithMore(['A', 'B', 'C', 'D', 'E'])).toBe('A, B, C and 2 more');
    });
});
