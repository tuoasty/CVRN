'use client';

import React from 'react';
import {Plus, Trash2} from 'lucide-react';
import {Button} from '@/app/components/ui/button';
import {Input} from '@/app/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/app/components/ui/select';
import {SPEC_STAT_KEYS, SpecTier} from '@/server/domains/spec/types';

export type DraftThreshold = {
    rowId: string;
    tier: SpecTier;
    statKey: string;
    minValue: number;
};

const STAT_GROUPS = Array.from(new Set(SPEC_STAT_KEYS.map(s => s.group)));

interface Props {
    tier: SpecTier;
    rows: DraftThreshold[];
    takenKeys: Set<string>;
    /** Live count of players clearing each requirement, keyed by rowId. */
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
    return (
        <div className="space-y-2">
            {rows.length === 0 && (
                <p className="text-xs text-muted-foreground/60 py-1">None.</p>
            )}
            {rows.map(row => {
                const passing = passCounts.get(row.rowId) ?? 0;
                return (
                    <div key={row.rowId} className="flex items-center gap-2">
                        <Select
                            value={row.statKey}
                            onValueChange={v => onChange(row.rowId, {statKey: v})}
                        >
                            <SelectTrigger className="rounded-sm flex-1 text-sm">
                                <SelectValue placeholder="Choose a stat" />
                            </SelectTrigger>
                            <SelectContent className="rounded-sm">
                                {STAT_GROUPS.map(group => (
                                    <React.Fragment key={group}>
                                        <div className="px-2 py-1.5 text-xs uppercase tracking-wide text-muted-foreground">
                                            {group}
                                        </div>
                                        {SPEC_STAT_KEYS.filter(s => s.group === group).map(s => (
                                            <SelectItem
                                                key={s.key}
                                                value={s.key as string}
                                                disabled={takenKeys.has(s.key as string) && row.statKey !== s.key}
                                                className="rounded-sm text-sm"
                                            >
                                                {s.label}
                                            </SelectItem>
                                        ))}
                                    </React.Fragment>
                                ))}
                            </SelectContent>
                        </Select>

                        <span className="text-muted-foreground text-sm shrink-0">≥</span>

                        <Input
                            type="number"
                            step="any"
                            value={String(row.minValue)}
                            onChange={e => onChange(row.rowId, {minValue: Number(e.target.value)})}
                            className="rounded-sm w-24 font-mono tabular-nums text-sm"
                        />

                        {/* Per-requirement pass count. Calibrating one threshold at a time
                            is far easier than reading the qualified total and guessing
                            which line is doing the cutting. */}
                        <span
                            className="text-xs font-mono tabular-nums text-muted-foreground w-20 text-right shrink-0"
                            title={`${passing} of ${totalPlayers} players clear this`}
                        >
                            {row.statKey ? `${passing}/${totalPlayers}` : '—'}
                        </span>

                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="rounded-sm text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                            onClick={() => onRemove(row.rowId)}
                            aria-label="Remove requirement"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </Button>
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
