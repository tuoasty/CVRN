'use client'

import { Fragment, ReactNode } from 'react'
import { ChevronDown, ChevronUp, X } from 'lucide-react'
import { Input } from '@/app/components/ui/input'
import NumberField from '@/app/features/overall/NumberField'
import type { CardLayer } from '@/server/domains/playerCard'
import type { CardImageLayer, CardTextLayer } from '@/server/domains/playerCard/types/schemas'
import { cn } from '@/lib/utils'
import { FIELD_LABEL, OPTION, OPTION_OFF, OPTION_ON } from './cardFormStyles'
import { CARD_SEGMENTS, colorInputValue, layerLabel, layerProblem, makeCustomTextLayer, moveLayer, segmentKey } from './cardSegments'

const POSITION_RANGE = { step: 1, min: -5000, max: 5000 }
const SIZE_RANGE = { step: 1, min: 1, max: 5000 }
const SPACING_RANGE = { step: 0.5, min: -20, max: 100 }
const TH = 'h-8 px-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border whitespace-nowrap'
const LINK = 'text-xs text-primary hover:underline underline-offset-4 rounded-sm focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50'
const ICON_BUTTON = 'inline-flex h-6 w-6 items-center justify-center rounded-sm text-muted-foreground focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-30'
const FITS: { value: CardImageLayer['fit']; label: string }[] = [
    { value: 'contain', label: 'Contain' },
    { value: 'cover', label: 'Cover' },
]

type BoxKey = 'x' | 'y' | 'w' | 'h'
type StylePatch = Partial<Pick<CardTextLayer, 'color' | 'uppercase' | 'letterSpacing'> & Pick<CardImageLayer, 'fit'>>

function LayerStyleControls({ layer, onPatch }: { layer: CardLayer; onPatch: (patch: StylePatch) => void }) {
    if (layer.kind === 'art') return null

    if (layer.kind === 'image' && layer.field === 'rig') {
        return <p className="text-xs text-muted-foreground">Shared by every rig card in this group. Players with a rig use this box instead of Avatar.</p>
    }

    if (layer.kind === 'image') {
        return (
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className={FIELD_LABEL}>Fit</span>
                <div className="flex items-end gap-3" role="radiogroup" aria-label={`${layerLabel(layer)} fit`}>
                    {FITS.map(fit => (
                        <button
                            key={fit.value}
                            type="button"
                            role="radio"
                            aria-checked={layer.fit === fit.value}
                            onClick={() => onPatch({ fit: fit.value })}
                            className={cn(OPTION, layer.fit === fit.value ? OPTION_ON : OPTION_OFF)}
                        >
                            {fit.label}
                        </button>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <label className="flex items-center gap-2">
                <span className={FIELD_LABEL}>Colour</span>
                <input
                    type="color"
                    value={colorInputValue(layer.color)}
                    aria-label={`${layerLabel(layer)} colour`}
                    onChange={e => onPatch({ color: e.target.value })}
                    className="h-6 w-8 cursor-pointer border border-border bg-transparent p-0"
                />
                <span className="font-mono text-xs tabular-nums text-muted-foreground">{colorInputValue(layer.color)}</span>
            </label>
            <div className="flex items-center gap-2">
                <span className={FIELD_LABEL}>Spacing</span>
                <NumberField
                    value={layer.letterSpacing}
                    range={SPACING_RANGE}
                    label={`${layerLabel(layer)} letter spacing`}
                    onCommit={letterSpacing => onPatch({ letterSpacing })}
                    className="w-16"
                />
            </div>
            {layer.kind === 'text' && (
                <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                    <input type="checkbox" checked={layer.uppercase} onChange={e => onPatch({ uppercase: e.target.checked })} />
                    Uppercase
                </label>
            )}
        </div>
    )
}

export default function CardLayoutEditor({
    layers,
    activeIndex,
    onChange,
    onActivate,
    rigRow,
}: {
    layers: CardLayer[]
    activeIndex: number | null
    onChange: (layers: CardLayer[]) => void
    onActivate: (index: number | null) => void
    rigRow?: ReactNode
}) {
    const update = (index: number, patch: Partial<Record<BoxKey | 'size', number>>) => {
        onChange(layers.map((layer, i) => {
            if (i !== index) return layer
            const { size, ...box } = patch
            return (layer.kind === 'text' || layer.kind === 'stats') && size !== undefined ? { ...layer, ...box, size } : { ...layer, ...box }
        }))
    }

    const patchStyle = (index: number, patch: StylePatch) => {
        onChange(layers.map((layer, i) => (i === index ? { ...layer, ...patch } as CardLayer : layer)))
    }

    const setText = (index: number, text: string) => {
        onChange(layers.map((layer, i) => (i === index && layer.kind === 'text' ? { ...layer, text } : layer)))
    }

    const remove = (index: number) => {
        onChange(layers.filter((_, i) => i !== index))
        onActivate(null)
    }

    const canMove = (index: number, delta: number) => moveLayer(layers, index, delta) !== layers

    const move = (index: number, delta: number) => {
        onChange(moveLayer(layers, index, delta))
        onActivate(index + delta)
    }

    const present = new Set(layers.map(segmentKey))
    const missing = CARD_SEGMENTS.filter(s => !present.has(s.key))

    return (
        <div className="flex flex-col gap-3">
            <table className="w-full border-collapse">
                <thead>
                    <tr>
                        <th className={cn(TH, 'text-left')}>Segment</th>
                        {(['X', 'Y', 'W', 'H', 'Size'] as const).map(h => (
                            <th key={h} className={cn(TH, 'w-16 text-right')}>{h}</th>
                        ))}
                        <th className={cn(TH, 'w-20')} aria-label="Order and remove" />
                    </tr>
                </thead>
                <tbody>
                    {layers.map((layer, i) => {
                        const problem = layerProblem(layer)
                        const isActive = activeIndex === i
                        return (
                            <Fragment key={i}>
                                <tr
                                    onFocus={() => onActivate(i)}
                                    onClick={() => onActivate(i)}
                                    className={cn(
                                        'border-b border-border/60',
                                        isActive && 'shadow-[inset_2px_0_0_hsl(var(--primary))]',
                                    )}
                                >
                                    <td className="h-8 px-1.5 text-sm">
                                        {layer.kind === 'text' && layer.field === 'custom' ? (
                                            <Input
                                                value={layer.text ?? ''}
                                                maxLength={60}
                                                aria-label="Custom text"
                                                aria-invalid={!!problem || undefined}
                                                onChange={e => setText(i, e.target.value)}
                                                className={cn('h-7 w-full max-w-[12rem] rounded-sm text-sm', problem && 'border-destructive')}
                                            />
                                        ) : (
                                            <span className={cn(isActive ? 'font-semibold text-foreground' : 'text-foreground')}>{layerLabel(layer)}</span>
                                        )}
                                        {problem && <span className="ml-2 text-xs text-destructive">{problem}</span>}
                                    </td>
                                    {(['x', 'y', 'w', 'h'] as const).map(key => (
                                        <td key={key} className="px-0.5">
                                            <NumberField
                                                value={layer[key]}
                                                range={key === 'x' || key === 'y' ? POSITION_RANGE : SIZE_RANGE}
                                                label={`${layerLabel(layer)} ${key.toUpperCase()}`}
                                                invalid={(key === 'w' || key === 'h') && !(layer[key] > 0)}
                                                onCommit={n => update(i, { [key]: n })}
                                            />
                                        </td>
                                    ))}
                                    <td className="px-0.5">
                                        {(layer.kind === 'text' || layer.kind === 'stats') && (
                                            <NumberField
                                                value={layer.size}
                                                range={SIZE_RANGE}
                                                label={`${layerLabel(layer)} size`}
                                                invalid={!(layer.size > 0)}
                                                onCommit={n => update(i, { size: n })}
                                            />
                                        )}
                                    </td>
                                    <td className="whitespace-nowrap px-0.5 text-right">
                                        {layer.kind === 'art' ? (
                                            <span className="pr-1.5 text-xs text-muted-foreground">Bottom</span>
                                        ) : (
                                            <>
                                                <button
                                                    type="button"
                                                    aria-label={`Move ${layerLabel(layer)} up`}
                                                    disabled={!canMove(i, -1)}
                                                    onClick={e => { e.stopPropagation(); move(i, -1) }}
                                                    className={cn(ICON_BUTTON, 'enabled:hover:text-foreground')}
                                                >
                                                    <ChevronUp className="h-3.5 w-3.5" aria-hidden />
                                                </button>
                                                <button
                                                    type="button"
                                                    aria-label={`Move ${layerLabel(layer)} down`}
                                                    disabled={!canMove(i, 1)}
                                                    onClick={e => { e.stopPropagation(); move(i, 1) }}
                                                    className={cn(ICON_BUTTON, 'enabled:hover:text-foreground')}
                                                >
                                                    <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                                                </button>
                                                <button
                                                    type="button"
                                                    aria-label={`Remove ${layerLabel(layer)}`}
                                                    onClick={e => { e.stopPropagation(); remove(i) }}
                                                    className={cn(ICON_BUTTON, 'hover:text-destructive')}
                                                >
                                                    <X className="h-3.5 w-3.5" aria-hidden />
                                                </button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                                {isActive && layer.kind !== 'art' && (
                                    <tr className="border-b border-border/60 shadow-[inset_2px_0_0_hsl(var(--primary))]">
                                        <td colSpan={7} className="px-1.5 py-2">
                                            <LayerStyleControls layer={layer} onPatch={patch => patchStyle(i, patch)} />
                                        </td>
                                    </tr>
                                )}
                                {layer.kind === 'image' && layer.field === 'rig' && rigRow}
                            </Fragment>
                        )
                    })}
                </tbody>
            </table>

            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Add</span>
                {missing.map(segment => (
                    <button
                        key={segment.key}
                        type="button"
                        className={LINK}
                        onClick={() => {
                            onChange([...layers, segment.make()])
                            onActivate(layers.length)
                        }}
                    >
                        {segment.label}
                    </button>
                ))}
                <button
                    type="button"
                    className={LINK}
                    onClick={() => {
                        onChange([...layers, makeCustomTextLayer()])
                        onActivate(layers.length)
                    }}
                >
                    Custom text
                </button>
            </div>
            <p className="text-xs text-muted-foreground">
                Canvas pixels. Rows draw top to bottom, later rows on top. Select a row for its colour, spacing, uppercase or fit. These apply to every tier in the group. Art stays at the bottom, and each tier&apos;s file is uploaded on Card Groups. Text is centered in its box and shrinks to fit, from Size down to half of it. Stats is one box split into 2 columns × 3 rows (SCR SPK BLK, then SET REC SRV), all at one shared size.{rigRow ? ' Rig image is for this player, season and group only. It is measured from the Rig box\'s top-left corner, cut off at the box\'s edges, and saves on its own.' : ''}
            </p>
        </div>
    )
}
