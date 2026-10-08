import {describe, expect, it} from 'vitest';
import {buildCatalogQuery, normalizeCatalogParams, orderRegions, RawCatalogParams} from '../catalogParams';

const CODES = ['AS', 'EU', 'NA', 'SA'];
const EMPTY: RawCatalogParams = {region: null, view: null, pos: null, spec: null, stat: null};

describe('normalizeCatalogParams', () => {
    it('defaults to the preferred region, then NA, then the first region', () => {
        expect(normalizeCatalogParams(EMPTY, CODES, 'EU')?.region).toBe('eu');
        expect(normalizeCatalogParams(EMPTY, CODES, null)?.region).toBe('na');
        expect(normalizeCatalogParams(EMPTY, ['AS', 'EU'], null)?.region).toBe('as');
        expect(normalizeCatalogParams(EMPTY, [], null)).toBeNull();
    });

    it('keeps a known URL region over the preferred one and replaces an unknown one', () => {
        expect(normalizeCatalogParams({...EMPTY, region: 'SA'}, CODES, 'EU')?.region).toBe('sa');
        expect(normalizeCatalogParams({...EMPTY, region: 'oce'}, CODES, 'EU')?.region).toBe('eu');
    });

    it('normalizes view and position and drops the selector of the other view', () => {
        expect(normalizeCatalogParams({...EMPTY, view: 'nope', pos: 'xx', stat: 'k'}, CODES, null)).toEqual({
            region: 'na',
            view: 'spec',
            pos: 'OUT',
            spec: null,
            stat: null,
        });
        expect(normalizeCatalogParams({...EMPTY, view: 'stat', pos: 'mid', spec: 's', stat: 'k'}, CODES, null)).toEqual({
            region: 'na',
            view: 'stat',
            pos: 'MID',
            spec: null,
            stat: 'k',
        });
    });
});

describe('buildCatalogQuery', () => {
    it('writes a canonical, round-trippable query', () => {
        expect(buildCatalogQuery({region: 'na', view: 'spec', pos: 'OUT', spec: 'id1', stat: null})).toBe(
            'region=na&pos=out&spec=id1'
        );
        expect(buildCatalogQuery({region: 'eu', view: 'stat', pos: 'SET', spec: null, stat: 'assists_per_set'})).toBe(
            'region=eu&view=stat&pos=set&stat=assists_per_set'
        );
    });
});

describe('orderRegions', () => {
    it('uses the fixed AS EU NA SA order and appends unknown regions', () => {
        const codes = orderRegions([{code: 'SA'}, {code: 'OCE'}, {code: 'EU'}, {code: 'na'}, {code: 'AS'}]).map(r => r.code);
        expect(codes).toEqual(['AS', 'EU', 'na', 'SA', 'OCE']);
    });
});
