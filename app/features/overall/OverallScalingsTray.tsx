"use client"

import { useEffect, useState } from 'react'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { OVERALL_POSITIONS } from '@/server/domains/overall/types'
import { defaultScalingFor } from '@/server/domains/overall/helpers/defaultScalings'
import type { OverallCategory, OverallPosition, OverallScaling, OverallScalingSet } from '@/server/domains/overall'
import { cn } from '@/lib/utils'
import { CATEGORY_COLUMNS } from './overallRows'

type CopySource = { id: string; name: string }

type Props = {
    scalings: OverallScalingSet
    savedPositions: OverallPosition[]
    dirty: boolean
    errors: string[]
    saving: boolean
    copying: boolean
    copySources: CopySource[]
    onChange: (scaling: OverallScaling) => void
    onSave: () => void
    onDiscard: () => void
    onCopy: (source: CopySource) => void
}

function NumberField({ label, value, step, onCommit, invalid }: {
    label: string
    value: number
    step: number
    onCommit: (n: number) => void
    invalid?: boolean
}) {
    const [text, setText] = useState(String(value))

    useEffect(() => {
        setText(prev => (Number(prev) === value && prev.trim() !== '' ? prev : String(value)))
    }, [value])

    return (
        <label className="flex flex-col gap-1 min-w-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
            <Input
                type="number"
                inputMode="decimal"
                step={step}
                value={text}
                aria-invalid={invalid || undefined}
                onChange={e => {
                    setText(e.target.value)
                    const n = e.target.valueAsNumber
                    if (Number.isFinite(n)) onCommit(n)
                }}
                onBlur={() => setText(String(value))}
                className={cn('rounded-sm font-mono tabular-nums h-9', invalid && 'border-destructive')}
            />
        </label>
    )
}

export default function OverallScalingsTray({
    scalings,
    savedPositions,
    dirty,
    errors,
    saving,
    copying,
    copySources,
    onChange,
    onSave,
    onDiscard,
    onCopy,
}: Props) {
    const [position, setPosition] = useState<OverallPosition>('OUT')
    const scaling = scalings[position]
    const totalWeight = CATEGORY_COLUMNS.reduce((sum, c) => sum + scaling.weights[c.key], 0)

    const setWeight = (category: OverallCategory, n: number) =>
        onChange({ ...scaling, weights: { ...scaling.weights, [category]: n } })

    const status = dirty
        ? 'Unsaved changes. The board is previewing them.'
        : savedPositions.length === 0
            ? 'Using defaults. Nothing is saved for this season yet.'
            : savedPositions.length < OVERALL_POSITIONS.length
                ? `Saved for ${savedPositions.join(', ')}. Others use defaults.`
                : 'All positions saved.'

    return (
        <section className="panel p-4 space-y-4" aria-label="Overall scalings">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Profile</span>
                <div className="flex items-center gap-4" role="tablist" aria-label="Scaling position">
                    {OVERALL_POSITIONS.map(p => (
                        <button
                            key={p}
                            type="button"
                            role="tab"
                            aria-selected={position === p}
                            onClick={() => setPosition(p)}
                            className={cn(
                                'text-sm font-semibold uppercase tracking-wider rounded-sm focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                                position === p
                                    ? 'text-foreground underline decoration-2 underline-offset-[6px]'
                                    : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            {p}
                        </button>
                    ))}
                </div>
                <button
                    type="button"
                    onClick={() => onChange(defaultScalingFor(position))}
                    className="ml-auto text-xs text-primary hover:underline underline-offset-4 rounded-sm focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                    Reset {position} to defaults
                </button>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {CATEGORY_COLUMNS.map(col => (
                    <div key={col.key} className="space-y-1">
                        <NumberField
                            label={col.title}
                            value={scaling.weights[col.key]}
                            step={0.5}
                            invalid={scaling.weights[col.key] < 0}
                            onCommit={n => setWeight(col.key, n)}
                        />
                        <span className="block text-xs font-mono tabular-nums text-muted-foreground">
                            {totalWeight > 0 ? `${Math.round((scaling.weights[col.key] / totalWeight) * 100)}%` : '0%'}
                        </span>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-3 gap-3 sm:max-w-md">
                <NumberField label="Floor" value={scaling.floor} step={1} invalid={scaling.floor >= scaling.ceil} onCommit={n => onChange({ ...scaling, floor: n })} />
                <NumberField label="Ceiling" value={scaling.ceil} step={1} invalid={scaling.floor >= scaling.ceil} onCommit={n => onChange({ ...scaling, ceil: n })} />
                <NumberField label="Curve" value={scaling.curve} step={0.1} invalid={scaling.curve <= 0} onCommit={n => onChange({ ...scaling, curve: n })} />
            </div>

            {errors.length > 0 && (
                <ul className="text-xs text-destructive space-y-0.5">
                    {errors.map(e => <li key={e}>{e}</li>)}
                </ul>
            )}

            <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-border pt-3">
                <span className={cn('text-xs', dirty ? 'text-foreground font-medium' : 'text-muted-foreground')}>{status}</span>

                {copySources.length > 0 && (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                        <span className="text-muted-foreground">Copy from</span>
                        {copySources.map(s => (
                            <button
                                key={s.id}
                                type="button"
                                disabled={copying || saving}
                                onClick={() => onCopy(s)}
                                className="text-primary hover:underline underline-offset-4 disabled:opacity-40 rounded-sm focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                            >
                                {s.name}
                            </button>
                        ))}
                    </div>
                )}

                <div className="ml-auto flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="rounded-sm" disabled={!dirty || saving} onClick={onDiscard}>
                        Discard
                    </Button>
                    <Button
                        size="sm"
                        className="rounded-sm"
                        disabled={saving || errors.length > 0 || (!dirty && savedPositions.length === OVERALL_POSITIONS.length)}
                        onClick={onSave}
                    >
                        {saving ? 'Saving...' : 'Save scalings'}
                    </Button>
                </div>
            </div>
        </section>
    )
}
