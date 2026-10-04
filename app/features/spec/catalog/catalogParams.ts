import {SPEC_POSITIONS, SpecPosition} from '@/server/domains/spec/types';

export type CatalogView = 'spec' | 'stat';

export interface CatalogParams {
    region: string;
    view: CatalogView;
    pos: SpecPosition;
    spec: string | null;
    stat: string | null;
}

export interface RawCatalogParams {
    region: string | null;
    view: string | null;
    pos: string | null;
    spec: string | null;
    stat: string | null;
}

export const DEFAULT_POSITION: SpecPosition = 'OUT';

export const REGION_ORDER = ['AS', 'NA', 'EU', 'SA'];

export function orderRegions<T extends {code: string}>(regions: T[]): T[] {
    const rank = (code: string) => {
        const i = REGION_ORDER.indexOf(code.toUpperCase());
        return i === -1 ? REGION_ORDER.length : i;
    };
    return [...regions].sort((a, b) => rank(a.code) - rank(b.code) || a.code.localeCompare(b.code));
}

export function readCatalogParams(get: (key: string) => string | null): RawCatalogParams {
    return {
        region: get('region'),
        view: get('view'),
        pos: get('pos'),
        spec: get('spec'),
        stat: get('stat'),
    };
}

export function defaultRegionCode(regionCodes: string[], preferredCode: string | null): string | null {
    const codes = regionCodes.map(c => c.toLowerCase());
    const preferred = preferredCode?.toLowerCase() ?? null;
    if (preferred && codes.includes(preferred)) return preferred;
    if (codes.includes('na')) return 'na';
    return codes[0] ?? null;
}

export function normalizeCatalogParams(
    raw: RawCatalogParams,
    regionCodes: string[],
    preferredCode: string | null
): CatalogParams | null {
    const codes = regionCodes.map(c => c.toLowerCase());
    const requested = raw.region?.toLowerCase() ?? null;
    const region = requested && codes.includes(requested) ? requested : defaultRegionCode(regionCodes, preferredCode);
    if (!region) return null;

    const view: CatalogView = raw.view === 'stat' ? 'stat' : 'spec';
    const upperPos = raw.pos?.toUpperCase() ?? null;
    const pos = SPEC_POSITIONS.some(p => p.code === upperPos) ? (upperPos as SpecPosition) : DEFAULT_POSITION;

    return {
        region,
        view,
        pos,
        spec: view === 'spec' ? raw.spec || null : null,
        stat: view === 'stat' ? raw.stat || null : null,
    };
}

export function buildCatalogQuery(params: CatalogParams): string {
    const query = new URLSearchParams();
    query.set('region', params.region);
    if (params.view === 'stat') query.set('view', 'stat');
    query.set('pos', params.pos.toLowerCase());
    if (params.view === 'spec' && params.spec) query.set('spec', params.spec);
    if (params.view === 'stat' && params.stat) query.set('stat', params.stat);
    return query.toString();
}
