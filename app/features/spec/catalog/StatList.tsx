'use client';

import {specStatLabel} from '@/server/domains/spec/types';
import SpecStatCombobox from '@/app/features/spec/SpecStatCombobox';
import {ListBandLabel, ListItem} from './SpecCatalogList';
import {StatCoverage} from './statView';

interface Props {
    regionCode: string;
    coverage: StatCoverage[];
    total: number;
    selectedStat: string | null;
    onSelect: (statKey: string) => void;
}

export default function StatList({regionCode, coverage, total, selectedStat, onSelect}: Props) {
    const used = new Set(coverage.map(c => c.statKey));
    const items = selectedStat && !used.has(selectedStat)
        ? [...coverage, {statKey: selectedStat, used: 0, unset: 0}]
        : coverage;

    return (
        <>
            <ListBandLabel>Used in {regionCode.toUpperCase()}</ListBandLabel>
            {items.map(c => (
                <ListItem
                    key={c.statKey}
                    active={c.statKey === selectedStat}
                    quiet={c.used === 0}
                    onClick={() => onSelect(c.statKey)}
                    label={specStatLabel(c.statKey)}
                    trailing={
                        c.unset > 0 ? (
                            <>◌ {c.unset} unset</>
                        ) : (
                            <span className="font-mono tabular-nums">
                                {c.used}/{total}
                            </span>
                        )
                    }
                />
            ))}
            <div className="px-3 py-1.5">
                <SpecStatCombobox
                    value=""
                    takenKeys={used}
                    onChange={onSelect}
                    trigger={
                        <button type="button" className="text-sm text-muted-foreground hover:text-foreground">
                            + Add a stat…
                        </button>
                    }
                />
            </div>
        </>
    );
}
