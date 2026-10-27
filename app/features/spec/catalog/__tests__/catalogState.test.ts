import {describe, expect, it} from 'vitest';
import {LeagueSpecWithAllRegions} from '@/server/domains/spec/types';
import {buildRegionState, groupByStars, referenceValue, specListMarker} from '../catalogState';

const NA = 'na-id';
const EU = 'eu-id';

function req(regionId: string, statKey: string, tier: string, minValue: number | null, createdAt = '2026-01-01') {
    return {
        id: `${regionId}-${statKey}`,
        spec_id: 's1',
        region_id: regionId,
        stat_key: statKey,
        tier,
        min_value: minValue,
        created_at: createdAt,
    };
}

function spec(overrides: Partial<LeagueSpecWithAllRegions> = {}): LeagueSpecWithAllRegions {
    return {
        id: 's1',
        name: 'Leon',
        stars: 5,
        position: 'OUT',
        height: 79,
        secondary_required: 0,
        is_vaulted: false,
        is_custom: false,
        game_key: null,
        photo_url: null,
        created_at: '',
        updated_at: '',
        requirements: [],
        rules: [],
        ...overrides,
    };
}

describe('buildRegionState', () => {
    it('keeps only the region rows, main before secondary, and reads the region rule', () => {
        const s = spec({
            requirements: [
                req(NA, 'aces_per_set', 'secondary', 0.4),
                req(EU, 'kills_per_set', 'main', 5),
                req(NA, 'kills_per_set', 'main', 6.5, '2026-01-02'),
                req(NA, 'hit_eff', 'main', null, '2026-01-01'),
            ],
            rules: [
                {spec_id: 's1', region_id: NA, secondary_required: 1, updated_at: ''},
                {spec_id: 's1', region_id: EU, secondary_required: 2, updated_at: ''},
            ],
        });
        expect(buildRegionState([s], NA).s1).toEqual({
            requirements: [
                {statKey: 'hit_eff', tier: 'main', minValue: null},
                {statKey: 'kills_per_set', tier: 'main', minValue: 6.5},
                {statKey: 'aces_per_set', tier: 'secondary', minValue: 0.4},
            ],
            secondaryRequired: 1,
        });
    });

    it('defaults secondaryRequired to 0 when the region has no rule', () => {
        expect(buildRegionState([spec()], NA).s1).toEqual({requirements: [], secondaryRequired: 0});
    });
});

describe('specListMarker', () => {
    it('reports none, unset count, or requirement count', () => {
        expect(specListMarker(undefined)).toEqual({kind: 'none'});
        expect(specListMarker({requirements: [], secondaryRequired: 0})).toEqual({kind: 'none'});
        expect(
            specListMarker({
                requirements: [
                    {statKey: 'a', tier: 'main', minValue: null},
                    {statKey: 'b', tier: 'main', minValue: 1},
                ],
                secondaryRequired: 0,
            })
        ).toEqual({kind: 'unset', count: 1});
        expect(
            specListMarker({requirements: [{statKey: 'a', tier: 'main', minValue: 1}], secondaryRequired: 0})
        ).toEqual({kind: 'count', count: 1});
    });
});

describe('groupByStars', () => {
    it('bands by stars descending with names sorted inside each band', () => {
        const bands = groupByStars([
            {stars: 4, name: 'Semeniuk'},
            {stars: 5, name: 'Lima'},
            {stars: 5, name: 'Ishikawa'},
        ]);
        expect(bands.map(b => [b.stars, b.items.map(i => i.name)])).toEqual([
            [5, ['Ishikawa', 'Lima']],
            [4, ['Semeniuk']],
        ]);
    });
});

describe('referenceValue', () => {
    it('distinguishes missing, unset and set', () => {
        const state = {
            requirements: [
                {statKey: 'a', tier: 'main' as const, minValue: null},
                {statKey: 'b', tier: 'main' as const, minValue: 2},
            ],
            secondaryRequired: 0,
        };
        expect(referenceValue(state, 'z')).toEqual({kind: 'none'});
        expect(referenceValue(state, 'a')).toEqual({kind: 'unset'});
        expect(referenceValue(state, 'b')).toEqual({kind: 'value', value: 2});
    });
});
