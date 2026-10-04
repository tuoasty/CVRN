import {describe, expect, it} from 'vitest';
import {RegionState} from '../catalogState';
import {orderCheckFlags, statCoverage} from '../statView';

describe('statCoverage', () => {
    it('counts specs using each stat and their unset values, in catalog order', () => {
        const state: RegionState = {
            a: {
                requirements: [
                    {statKey: 'errors_total', tier: 'secondary', minValue: 8},
                    {statKey: 'kills_per_set', tier: 'main', minValue: 6},
                ],
                secondaryRequired: 0,
            },
            b: {requirements: [{statKey: 'kills_per_set', tier: 'main', minValue: null}], secondaryRequired: 0},
            other: {requirements: [{statKey: 'digs_per_set', tier: 'main', minValue: 1}], secondaryRequired: 0},
        };
        expect(statCoverage(['a', 'b', 'missing'], state)).toEqual([
            {statKey: 'kills_per_set', used: 2, unset: 1},
            {statKey: 'errors_total', used: 1, unset: 0},
        ]);
    });
});

describe('orderCheckFlags', () => {
    const rows = [
        {specId: 'leon', name: 'Leon', stars: 5, value: 6.5},
        {specId: 'ishikawa', name: 'Ishikawa', stars: 5, value: 6},
        {specId: 'semeniuk', name: 'Semeniuk', stars: 4, value: 6.2},
        {specId: 'russell', name: 'Russell', stars: 3, value: 7},
        {specId: 'lima', name: 'Lima', stars: 5, value: null},
        {specId: 'rousseaux', name: 'Rousseaux', stars: 4, value: 5},
    ];

    it('flags a lower-star spec that is harder than a higher-star one, naming the easiest higher-star spec', () => {
        expect(orderCheckFlags(rows, false)).toEqual({
            semeniuk: {name: 'Ishikawa', stars: 5, value: 6},
            russell: {name: 'Rousseaux', stars: 4, value: 5},
        });
    });

    it('inverts for lower-is-better stats and ignores unset values', () => {
        const errors = [
            {specId: 'top', name: 'Top', stars: 5, value: 8},
            {specId: 'mid', name: 'Mid', stars: 4, value: 6},
            {specId: 'low', name: 'Low', stars: 3, value: 10},
            {specId: 'blank', name: 'Blank', stars: 3, value: null},
        ];
        expect(orderCheckFlags(errors, true)).toEqual({
            mid: {name: 'Top', stars: 5, value: 8},
        });
    });
});
