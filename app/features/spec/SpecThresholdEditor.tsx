'use client';

import {Plus, Trash2} from 'lucide-react';
import {cn} from '@/lib/utils';
import {Button} from '@/app/components/ui/button';
import SpecStatCombobox from '@/app/features/spec/SpecStatCombobox';
import {SpecTier, isLowerIsBetterStatKey} from '@/server/domains/spec/types';

export type DraftThreshold = {
    rowId: string;
    tier: SpecTier;
    statKey: string;
    minValue: number;
};

interface Props {
    tier: SpecTier;
    rows: DraftThreshold[];
    takenKeys: Set<string>;

    passCounts: Map<string, number>;
    totalPlayers: number;
    onChange: (rowId: string, patch: Partial<DraftThreshold>) => void;
    onRemove: (rowId: string) => void;
    onAdd: (tier: SpecTier) => void;
}

export default function SpecThresholdEditor({
    tier,
    rows,
    takenKeys,
    passCounts,
    totalPlayers,
    onChange,
    onRemove,
    onAdd,
}: Props) {
    const showPass = totalPlayers > 0;

    return (
        <div className="space-y-2">
            {rows.length === 0 && (
                <p className="text-xs text-muted-foreground/60 py-1">None.</p>
            )}
            {rows.map(row => {
                const passing = passCounts.get(row.rowId) ?? 0;
                const op = isLowerIsBetterStatKey(row.statKey) ? '≤' : '≥';
                const pct = showPass ? Math.round((passing / totalPlayers) * 100) : 0;
                return (
                    <div key={row.rowId} className="space-y-1">
                        <div className="flex items-center gap-1.5">
                            <div className="flex-1 min-w-0">
                                <SpecStatCombobox
                                    value={row.statKey}
                                    onChange={v => onChange(row.rowId, {statKey: v})}
                                    takenKeys={takenKeys}
                                />
                            </div>

                            <div className="flex h-9 w-[5.25rem] shrink-0 items-center overflow-hidden rounded-md border border-input bg-transparent focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/40">
                                <span className="select-none border-r border-input px-1.5 text-sm text-muted-foreground">
                                    {op}
                                </span>
                                <input
                                    type="number"
                                    step="any"
                                    value={String(row.minValue)}
                                    onChange={e => onChange(row.rowId, {minValue: Number(e.target.value)})}
                                    className="w-full min-w-0 bg-transparent px-1.5 text-right font-mono tabular-nums text-sm outline-none"
                                    aria-label="Threshold"
                                />
                            </div>

                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-9 w-9 shrink-0 rounded-md p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => onRemove(row.rowId)}
                                aria-label="Remove requirement"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                        </div>

                        {showPass && row.statKey && (
                            <div className="flex items-center gap-2 pl-0.5">
                                <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                                    <div
                                        className={cn('h-full', pct === 0 ? 'bg-transparent' : 'bg-primary/50')}
                                        style={{width: `${pct}%`}}
                                    />
                                </div>
                                <span className="shrink-0 font-mono tabular-nums text-xs text-muted-foreground">
                                    {passing}/{totalPlayers}
                                </span>
                            </div>
                        )}
                    </div>
                );
            })}
            <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-sm gap-1"
                onClick={() => onAdd(tier)}
            >
                <Plus className="h-3 w-3" />
                Add {tier} requirement
            </Button>
        </div>
    );
}
