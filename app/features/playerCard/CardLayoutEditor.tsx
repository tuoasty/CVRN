'use client'

import { X } from 'lucide-react'
import { Input } from '@/app/components/ui/input'
import NumberField from '@/app/features/overall/NumberField'
import type { CardLayer } from '@/server/domains/playerCard'
import { cn } from '@/lib/utils'
import { CARD_SEGMENTS, layerLabel, layerProblem, makeCustomTextLayer, segmentKey } from './cardSegments'

const POSITION_RANGE = { step: 1, min: -5000, max: 5000 }
const SIZE_RANGE = { step: 1, min: 1, max: 5000 }
const TH = 'h-8 px-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border whitespace-nowrap'
const LINK = 'text-xs text-primary hover:underline underline-offset-4 rounded-sm focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50'

type BoxKey = 'x' | 'y' | 'w' | 'h'

export default function CardLayoutEditor({
    layers,
    activeIndex,
    onChange,
    onActivate,
}: {
    layers: CardLayer[]
    activeIndex: number | null
    onChange: (layers: CardLayer[]) => void
    onActivate: (index: number | null) => void
}) {
    const update = (index: number, patch: Partial<Record<BoxKey | 'size', number>>) => {
        onChange(layers.map((layer, i) => {
            if (i !== index) return layer
            const { size, ...box } = patch
            return (layer.kind === 'text' || layer.kind === 'stats') && size !== undefined ? { ...layer, ...box, size } : { ...layer, ...box }
        }))
    }

    const setText = (index: number, text: string) => {
        onChange(layers.map((layer, i) => (i === index && layer.kind === 'text' ? { ...layer, text } : layer)))
    }

    const remove = (index: number) => {
        onChange(layers.filter((_, i) => i !== index))
        onActivate(null)
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
                        <th className={cn(TH, 'w-7')} aria-label="Remove" />
                    </tr>
                </thead>
                <tbody>
                    {layers.map((layer, i) => {
                        const problem = layerProblem(layer)
                        return (
                            <tr
                                key={i}
                                onFocus={() => onActivate(i)}
                                onClick={() => onActivate(i)}
                                className={cn(
                                    'border-b border-border/60',
                                    activeIndex === i && 'shadow-[inset_2px_0_0_hsl(var(--primary))]',
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
                                        <span className={cn(activeIndex === i ? 'font-semibold text-foreground' : 'text-foreground')}>{layerLabel(layer)}</span>
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
                                <td className="px-0.5 text-right">
                                    <button
                                        type="button"
                                        aria-label={`Remove ${layerLabel(layer)}`}
                                        onClick={e => { e.stopPropagation(); remove(i) }}
                                        className="inline-flex h-6 w-6 items-center justify-center rounded-sm text-muted-foreground hover:text-destructive focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                    >
                                        <X className="h-3.5 w-3.5" aria-hidden />
                                    </button>
                                </td>
                            </tr>
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
                Canvas pixels. Rows draw top to bottom, later rows on top. Text is centered in its box and shrinks to fit, from Size down to half of it. Stats is one box split into 2 columns × 3 rows (SCR SPK BLK, then SET REC SRV), all at one shared size.
            </p>
        </div>
    )
}
