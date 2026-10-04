'use client';

import {useCallback, useEffect, useMemo} from 'react';
import {usePathname, useRouter, useSearchParams} from 'next/navigation';
import {Region} from '@/shared/types/db';
import {SpecPosition} from '@/server/domains/spec/types';
import {
    CatalogParams,
    CatalogView,
    buildCatalogQuery,
    normalizeCatalogParams,
    readCatalogParams,
} from './catalogParams';

export function useSpecCatalogUrl(regions: Region[], preferredRegionId: string | null) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const preferredCode = regions.find(r => r.id === preferredRegionId)?.code ?? null;
    const regionCodes = useMemo(() => regions.map(r => r.code), [regions]);

    const params = useMemo(
        () =>
            regionCodes.length > 0
                ? normalizeCatalogParams(readCatalogParams(k => searchParams.get(k)), regionCodes, preferredCode)
                : null,
        [searchParams, regionCodes, preferredCode]
    );

    const region = params ? regions.find(r => r.code.toLowerCase() === params.region) ?? null : null;

    const write = useCallback(
        (next: CatalogParams) => router.replace(`${pathname}?${buildCatalogQuery(next)}`, {scroll: false}),
        [pathname, router]
    );

    useEffect(() => {
        if (!params) return;
        if (buildCatalogQuery(params) !== searchParams.toString()) write(params);
    }, [params, searchParams, write]);

    const setRegion = useCallback(
        (code: string) => params && write({...params, region: code.toLowerCase()}),
        [params, write]
    );
    const setView = useCallback(
        (view: CatalogView) => params && write({...params, view, spec: null, stat: null}),
        [params, write]
    );
    const setPos = useCallback(
        (pos: SpecPosition) => params && write({...params, pos, spec: null, stat: null}),
        [params, write]
    );
    const selectSpec = useCallback(
        (spec: string, pos?: SpecPosition) => params && write({...params, view: 'spec', pos: pos ?? params.pos, spec, stat: null}),
        [params, write]
    );
    const selectStat = useCallback(
        (stat: string) => params && write({...params, view: 'stat', stat, spec: null}),
        [params, write]
    );

    return {params, region, setRegion, setView, setPos, selectSpec, selectStat};
}
