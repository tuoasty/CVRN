'use client';

import {RotateCcw, Save} from 'lucide-react';
import {cn} from '@/lib/utils';
import {Button} from '@/app/components/ui/button';
import {BonusScope, PlacementBonusConfig, PLACEMENT_LADDER_SIZE} from '@/server/domains/spec/types';
import {formatPlacement} from '@/app/utils/placement';

const EDITABLE_RUNGS = 6;

interface Props {
    value: PlacementBonusConfig;
    isCustom: boolean;
    dirty: boolean;
    saving: boolean;
    disabled: boolean;
    onChange: (next: PlacementBonusConfig) => void;
    onSave: () => void;
    onReset: () => void;
}

const toPct = (fraction: number) => Math.round(fraction * 1000) / 10;
const fromPct = (pct: number) => pct / 100;

function PctField({
    label,
    value,
    onChange,
    disabled,
}: {
    label: string;
    value: number;
    onChange: (fraction: number) => void;
    disabled: boolean;
}) {
    return (
        <label className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground truncate">{label}</span>
            <span
                className={cn(
                    'flex items-center rounded-sm border border-border bg-background pr-1.5 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/40',
                    disabled && 'opacity-50'
                )}
            >
                <input
                    type="number"
                    step="0.5"
                    inputMode="decimal"
                    disabled={disabled}
                    value={String(toPct(value))}
                    onChange={e => onChange(fromPct(Number(e.target.value)))}
                    className={cn(
                        'w-12 bg-transparent px-1.5 py-1 text-right font-mono tabular-nums text-sm outline-none',
                        value > 0 && 'text-success',
                        value < 0 && 'text-destructive'
                    )}
                    aria-label={label}
                />
                <span className="text-xs text-muted-foreground select-none">%</span>
            </span>
        </label>
    );
}

function ScopeToggle({
    label,
    checked,
    onChange,
    disabled,
}: {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled: boolean;
}) {
    return (
        <label
            className={cn(
                'flex items-center gap-1.5 rounded-sm border px-2 py-1.5 select-none transition-colors',
                disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
                checked ? 'border-primary/50 bg-primary/10' : 'border-border bg-background'
            )}
        >
            <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={e => onChange(e.target.checked)}
                className="h-3.5 w-3.5 shrink-0 rounded-sm accent-primary"
            />
            <span
                className={cn(
                    'truncate text-xs font-medium',
                    checked ? 'text-primary' : 'text-muted-foreground'
                )}
            >
                {label}
            </span>
        </label>
    );
}

export default function PlacementBonusEditor({
    value,
    isCustom,
    dirty,
    saving,
    disabled,
    onChange,
    onSave,
    onReset,
}: Props) {
    const setLadder = (i: number, fraction: number) => {
        const ladder = value.ladder.slice(0, PLACEMENT_LADDER_SIZE);
        ladder[i] = fraction;
        onChange({...value, ladder});
    };

    const setScope = (key: keyof BonusScope, checked: boolean) => {
        onChange({...value, scope: {...value.scope, [key]: checked}});
    };

    return (
        <section className="rounded-sm border border-border bg-background">
            <header className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide">Placement bonuses</h3>
                <span
                    className={cn(
                        'rounded-sm px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wide',
                        isCustom ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                    )}
                    title={isCustom ? 'Saved for this region' : 'Using code defaults'}
                >
                    {isCustom ? 'Custom' : 'Defaults'}
                </span>
            </header>

            <div className="space-y-3 p-3">
                <PctField
                    label="Upper finalist"
                    value={value.upperFinalist}
                    onChange={f => onChange({...value, upperFinalist: f})}
                    disabled={disabled}
                />

                <div className="grid grid-cols-2 gap-x-3 gap-y-2 border-t border-border pt-3">
                    {Array.from({length: EDITABLE_RUNGS}, (_, i) => (
                        <PctField
                            key={i}
                            label={formatPlacement(i + 1, 1)}
                            value={value.ladder[i] ?? 0}
                            onChange={f => setLadder(i, f)}
                            disabled={disabled}
                        />
                    ))}
                </div>

                <div className="border-t border-border pt-3">
                    <PctField
                        label="Outside top 8"
                        value={value.outside}
                        onChange={f => onChange({...value, outside: f})}
                        disabled={disabled}
                    />
                    <p className="mt-1.5 text-xs leading-tight text-muted-foreground/70">
                        7th–8th are fixed at 0%. Bonuses scale the stat types selected below.
                    </p>
                </div>

                <div className="border-t border-border pt-3">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Apply to
                    </span>
                    <div className="mt-2 grid grid-cols-3 gap-1.5">
                        <ScopeToggle
                            label="Total"
                            checked={value.scope.count}
                            onChange={c => setScope('count', c)}
                            disabled={disabled}
                        />
                        <ScopeToggle
                            label="Per set"
                            checked={value.scope.per_set}
                            onChange={c => setScope('per_set', c)}
                            disabled={disabled}
                        />
                        <ScopeToggle
                            label="%"
                            checked={value.scope.pct}
                            onChange={c => setScope('pct', c)}
                            disabled={disabled}
                        />
                    </div>
                    <p className="mt-1.5 text-xs leading-tight text-muted-foreground/70">
                        Errors are never scaled. % can exceed 100% when boosted.
                    </p>
                </div>

                <div className="flex items-center gap-2 border-t border-border pt-3">
                    <Button
                        type="button"
                        size="sm"
                        className="rounded-sm gap-1 flex-1"
                        disabled={disabled || saving || !dirty}
                        onClick={onSave}
                    >
                        <Save className="h-3.5 w-3.5" />
                        {saving ? 'Saving…' : dirty ? 'Save' : 'Saved'}
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-sm gap-1"
                        disabled={disabled || saving || (!isCustom && !dirty)}
                        onClick={onReset}
                        title="Reset this region to code defaults"
                    >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Reset
                    </Button>
                </div>
            </div>
        </section>
    );
}
