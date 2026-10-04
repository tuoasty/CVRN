'use client';

import {useCallback, useMemo, useState} from 'react';
import {RegionState} from './catalogState';
import {SpecStateEdit, applyDraftEdit, effectiveSpecState, summarizeDraft} from './regionDraft';

interface DraftBox {
    regionId: string | null;
    specs: RegionState;
}

const EMPTY: RegionState = {};

export function useRegionDraft(regionId: string | null, baseline: RegionState) {
    const [box, setBox] = useState<DraftBox>({regionId, specs: EMPTY});
    const draft = box.regionId === regionId ? box.specs : EMPTY;

    const edit = useCallback(
        (specId: string, change: SpecStateEdit) =>
            setBox(prev => {
                const current = prev.regionId === regionId ? prev.specs : EMPTY;
                return {regionId, specs: applyDraftEdit(baseline, current, specId, change)};
            }),
        [regionId, baseline]
    );

    const discard = useCallback(() => setBox({regionId, specs: EMPTY}), [regionId]);

    const discardSpec = useCallback(
        (specId: string) =>
            setBox(prev => {
                const rest = {...prev.specs};
                delete rest[specId];
                return {...prev, specs: rest};
            }),
        []
    );

    const summary = useMemo(() => summarizeDraft(baseline, draft), [baseline, draft]);

    const stateOf = useCallback((specId: string) => effectiveSpecState(baseline, draft, specId), [baseline, draft]);

    return {draft, edit, discard, discardSpec, summary, stateOf, dirty: summary.changes > 0};
}
