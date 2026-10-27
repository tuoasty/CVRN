"use client"

import { useState } from 'react'
import { Button } from '@/app/components/ui/button'
import { OVERALL_POSITIONS, WEIGHT_TOTAL } from '@/server/domains/overall/types'
import { defaultScalingFor } from '@/server/domains/overall/helpers/defaultScalings'
import { weightTotal } from '@/server/domains/overall/helpers/normalizeWeights'
import type { OverallCategory, OverallPosition, OverallScaling, OverallScalingSet } from '@/server/domains/overall'
import { cn } from '@/lib/utils'
import NumberField, { CEIL_RANGE, CURVE_RANGE, FLOOR_RANGE, ScrubLabel, WEIGHT_RANGE } from './NumberField'
import { CATEGORY_COLUMNS } from './overallRows'

export type CopySource = { id: string; name: string; regionCode: string }

type Props = {
    mode: OverallPosition | 'ALL'
    scalings: OverallScalingSet
    savedPositions: OverallPosition[]
    dirtyPositions: OverallPosition[]
    errors: string[]
    saving: boolean
    copying: boolean
    copySources: CopySource[]
    onChange: (scaling: OverallScaling) => void
    onSelectPosition: (position: OverallPosition) => void
    onSave: () => void
    onDiscard: () => void
    onCopy: (source: CopySource) => void
}

const SECTION_LABEL = 'text-xs font-semibold uppercase tracking-wider text-muted-foreground'
const LINK = 'text-xs text-primary hover:underline underline-offset-4 rounded-sm focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-40 disabled:no-underline'

function setWeight(scaling: OverallScaling, category: OverallCategory, n: number): OverallScaling {
    return { ...scaling, weights: { ...scaling.weights, [category]: n } }
}

function budgetMessage(total: number): string | null {
    if (total === WEIGHT_TOTAL) return null
    const gap = Math.abs(WEIGHT_TOTAL - total)
    return total < WEIGHT_TOTAL ? `${gap} ${gap === 1 ? 'point' : 'points'} left to place` : `${gap} ${gap === 1 ? 'point' : 'points'} over`
}

function PositionEditor({ scaling, onChange }: { scaling: OverallScaling; onChange: (s: OverallScaling) => void }) {
    const total = weightTotal(scaling.weights)
    const budget = budgetMessage(total)
    return (
        <>
            <div className={SECTION_LABEL}>Weights · out of {WEIGHT_TOTAL}</div>
            <div className="mt-1">
                {CATEGORY_COLUMNS.map(col => (
                    <div key={col.key} className="grid h-8 grid-cols-[1fr_4rem] items-center border-b border-border/60">
                        <ScrubLabel
                            value={scaling.weights[col.key]}
                            onCommit={n => onChange(setWeight(scaling, col.key, n))}
                            range={WEIGHT_RANGE}
                            className="text-sm"
                        >
                            {col.title}
                        </ScrubLabel>
                        <NumberField
                            label={`${scaling.position} ${col.title} weight`}
                            value={scaling.weights[col.key]}
                            onCommit={n => onChange(setWeight(scaling, col.key, n))}
                            range={WEIGHT_RANGE}
                        />
                    </div>
                ))}
                <div className="grid h-8 grid-cols-[1fr_4rem] items-center text-sm font-semibold">
                    <span>Total</span>
                    <span className={cn('pr-[7px] text-right font-mono tabular-nums', budget && 'text-destructive')}>
                        {total} / {WEIGHT_TOTAL}
                    </span>
                </div>
                {budget && <p className="text-xs text-destructive">{budget} before this can be saved.</p>}
            </div>

            <div className={cn(SECTION_LABEL, 'mt-5')}>Scale</div>
            <div className="mt-1 grid grid-cols-3 gap-2">
                {([
                    ['Floor', 'floor', FLOOR_RANGE],
                    ['Ceiling', 'ceil', CEIL_RANGE],
                    ['Curve', 'curve', CURVE_RANGE],
                ] as const).map(([label, key, range]) => (
                    <label key={key} className="flex flex-col text-xs text-muted-foreground">
                        <ScrubLabel value={scaling[key]} onCommit={n => onChange({ ...scaling, [key]: n })} range={range}>
                            {label}
                        </ScrubLabel>
                        <NumberField
                            label={`${scaling.position} ${label}`}
                            value={scaling[key]}
                            onCommit={n => onChange({ ...scaling, [key]: n })}
                            range={range}
                            invalid={key !== 'curve' && scaling.floor >= scaling.ceil}
                        />
                    </label>
                ))}
            </div>
        </>
    )
}

function ProfileGrid({ scalings, dirtyPositions, onChange, onSelectPosition }: {
    scalings: OverallScalingSet
    dirtyPositions: OverallPosition[]
    onChange: (s: OverallScaling) => void
    onSelectPosition: (position: OverallPosition) => void
}) {
    return (
        <>
            <div className={SECTION_LABEL}>Weights · out of {WEIGHT_TOTAL}</div>
            <table className="mt-1 border-collapse">
                <thead>
                    <tr>
                        <th className="w-12" />
                        {CATEGORY_COLUMNS.map(col => (
                            <th key={col.key} title={col.title} className="h-7 pl-1.5 text-right text-xs font-semibold tracking-wider text-muted-foreground">
                                {col.label}
                            </th>
                        ))}
                        <th className="pl-3" />
                    </tr>
                </thead>
                <tbody>
                    {OVERALL_POSITIONS.map(position => {
                        const scaling = scalings[position]
                        const total = weightTotal(scaling.weights)
                        return (
                            <tr key={position} className="border-t border-border/60">
                                <td className="pr-2">
                                    <button
                                        type="button"
                                        onClick={() => onSelectPosition(position)}
                                        title={`Edit ${position} profile and scale`}
                                        className="text-xs font-semibold text-primary hover:underline underline-offset-4 rounded-sm focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                    >
                                        {position}
                                        {dirtyPositions.includes(position) && <span className="ml-0.5 text-foreground" aria-label="unsaved">•</span>}
                                    </button>
                                </td>
                                {CATEGORY_COLUMNS.map(col => (
                                    <td key={col.key} className="py-0.5">
                                        <NumberField
                                            label={`${position} ${col.title} weight`}
                                            value={scaling.weights[col.key]}
                                            onCommit={n => onChange(setWeight(scaling, col.key, n))}
                                            range={WEIGHT_RANGE}
                                            className="w-11"
                                        />
                                    </td>
                                ))}
                                <td className={cn('pl-3 text-right font-mono text-sm font-semibold tabular-nums', total !== WEIGHT_TOTAL && 'text-destructive')}>
                                    {total}
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
            <p className="mt-2 text-xs text-muted-foreground">Scale is set on each position&apos;s tab.</p>
        </>
    )
}

export default function OverallProfileSidebar({
    mode,
    scalings,
    savedPositions,
    dirtyPositions,
    errors,
    saving,
    copying,
    copySources,
    onChange,
    onSelectPosition,
    onSave,
    onDiscard,
    onCopy,
}: Props) {
    const [copyOpen, setCopyOpen] = useState(false)
    const dirty = dirtyPositions.length > 0
    const allSaved = savedPositions.length === OVERALL_POSITIONS.length

    const status = dirty
        ? `${dirtyPositions.join(', ')} changed`
        : savedPositions.length === 0
            ? 'Using defaults. Nothing saved for this season yet.'
            : allSaved
                ? 'All profiles saved.'
                : `Saved: ${savedPositions.join(', ')}. Others use defaults.`

    const copyGroups = copySources.reduce<{ regionCode: string; sources: CopySource[] }[]>((groups, source) => {
        const last = groups[groups.length - 1]
        if (last && last.regionCode === source.regionCode) last.sources.push(source)
        else groups.push({ regionCode: source.regionCode, sources: [source] })
        return groups
    }, [])

    return (
        <aside className="shrink-0 lg:sticky lg:top-6 lg:w-[23rem]" aria-label="Overall profiles">
            {mode === 'ALL' ? (
                <ProfileGrid scalings={scalings} dirtyPositions={dirtyPositions} onChange={onChange} onSelectPosition={onSelectPosition} />
            ) : (
                <PositionEditor scaling={scalings[mode]} onChange={onChange} />
            )}

            {errors.length > 0 && (
                <ul className="mt-3 space-y-0.5 text-xs text-destructive">
                    {errors.map(e => <li key={e}>{e}</li>)}
                </ul>
            )}

            <div className="mt-5 flex flex-col items-start gap-2.5">
                <span className={cn('text-xs', dirty ? 'text-foreground' : 'text-muted-foreground')}>{status}</span>
                <div className="flex items-center gap-3">
                    <Button
                        size="sm"
                        className="rounded-sm"
                        disabled={saving || errors.length > 0 || (!dirty && allSaved)}
                        onClick={onSave}
                    >
                        {saving ? 'Saving...' : 'Save'}
                    </Button>
                    <button type="button" className={LINK} disabled={!dirty || saving} onClick={onDiscard}>
                        Discard
                    </button>
                </div>

                {copySources.length > 0 && (
                    <button type="button" className={LINK} aria-expanded={copyOpen} onClick={() => setCopyOpen(o => !o)}>
                        Copy all profiles from another season…
                    </button>
                )}
                {copyOpen && (
                    <div className="w-full space-y-1 text-xs">
                        {copyGroups.map(group => (
                            <div key={group.regionCode} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                                <span className="w-7 shrink-0 font-semibold text-foreground">{group.regionCode}</span>
                                {group.sources.map(s => (
                                    <button
                                        key={s.id}
                                        type="button"
                                        disabled={copying || saving}
                                        onClick={() => onCopy(s)}
                                        className={LINK}
                                    >
                                        {s.name}
                                    </button>
                                ))}
                            </div>
                        ))}
                    </div>
                )}

                {mode !== 'ALL' && (
                    <button type="button" className={LINK} onClick={() => onChange(defaultScalingFor(mode))}>
                        Reset {mode} to defaults
                    </button>
                )}
            </div>
        </aside>
    )
}
