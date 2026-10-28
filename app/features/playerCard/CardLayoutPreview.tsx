'use client'

import type { CardLayer } from '@/server/domains/playerCard'
import { cn } from '@/lib/utils'
import { layerLabel } from './cardSegments'

const pct = (n: number, of: number) => `${(n / of) * 100}%`

export default function CardLayoutPreview({
    image,
    width,
    height,
    layers,
    activeIndex,
    isRendering,
    error,
    showBorders,
    onActivate,
}: {
    image: string | null
    width: number
    height: number
    layers: CardLayer[]
    activeIndex: number | null
    isRendering: boolean
    error: string | null
    showBorders: boolean
    onActivate: (index: number) => void
}) {
    return (
        <div className="flex flex-col gap-2">
            <div
                className="relative w-full overflow-hidden border border-border bg-muted"
                style={{ aspectRatio: `${width} / ${height}` }}
            >
                {image && <img src={image} alt="Card preview" className="absolute inset-0 h-full w-full" />}
                {showBorders && layers.map((layer, i) => {
                    const active = i === activeIndex
                    return (
                        <button
                            key={i}
                            type="button"
                            aria-label={`Select ${layerLabel(layer)}`}
                            onClick={() => onActivate(i)}
                            className={cn(
                                'absolute border focus:outline-none',
                                layer.kind === 'art' && !active && 'pointer-events-none',
                                active
                                    ? 'z-10 border-2 border-primary bg-primary/10'
                                    : 'border-white/80 shadow-[0_0_0_1px_rgba(0,0,0,0.55)] hover:bg-white/10',
                            )}
                            style={{
                                left: pct(layer.x, width),
                                top: pct(layer.y, height),
                                width: pct(layer.w, width),
                                height: pct(layer.h, height),
                            }}
                        >
                            {layer.kind !== 'art' && (
                                <span
                                    className={cn(
                                        'absolute left-0 top-0 whitespace-nowrap px-1 font-mono text-xs leading-4',
                                        active ? 'bg-primary text-primary-foreground' : 'bg-black/70 text-white',
                                    )}
                                >
                                    {layerLabel(layer)}
                                </span>
                            )}
                        </button>
                    )
                })}
                {isRendering && (
                    <span className="absolute right-1.5 top-1.5 bg-black/70 px-1.5 font-mono text-xs leading-4 text-white">Rendering</span>
                )}
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <p className="font-mono text-xs tabular-nums text-muted-foreground">Canvas {width} × {height}</p>
        </div>
    )
}
