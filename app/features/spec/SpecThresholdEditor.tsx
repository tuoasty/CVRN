'use client';

import {Plus, Trash2} from 'lucide-react';
import {cn} from '@/lib/utils';
import {Button} from '@/app/components/ui/button';
import {Input} from '@/app/components/ui/input';
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
                return (
                    <div key={row.rowId} className={cn(showPass && 'space-y-1')}>
                        <div
                            className={cn(
                                'grid gap-2 items-center',
                                showPass ? 'grid-cols-[minmax(0,1fr)_4.5rem_2rem]' : 'grid-cols-[6fr_3fr_1fr]'
                            )}
                        >
                            <SpecStatCombobox
                                value={row.statKey}
                                onChange={v => onChange(row.rowId, {statKey: v})}
                                takenKeys={takenKeys}
                            />

                            <div className="flex items-center gap-1 min-w-0">
                                <span className="text-muted-foreground text-sm shrink-0">{op}</span>
                                <Input
                                    type="number"
                                    step="any"
                                    value={String(row.minValue)}
                                    onChange={e => onChange(row.rowId, {minValue: Number(e.target.value)})}
                                    className="rounded-sm w-full min-w-0 font-mono tabular-nums text-sm"
                                />
                            </div>

                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="rounded-sm text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0 justify-self-end"
                                onClick={() => onRemove(row.rowId)}
                                aria-label="Remove requirement"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                        </div>

                        {showPass && row.statKey && (
                            <p className="text-xs font-mono tabular-nums text-muted-foreground/70 pl-1">
                                {passing}/{totalPlayers} clear this
                            </p>
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
