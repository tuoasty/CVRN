"use client"

import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { InspectorData, PublicBuild, PublicBuildEffect } from '@/server/domains/gameData'
import Collapse from '../Collapse'
import InspectorTrigger from '../inspector/InspectorTrigger'

export const BUILD_GRID = 'md:grid-cols-[180px_140px_160px_150px_minmax(0,1fr)_64px] md:gap-x-6'

interface Props {
    build: PublicBuild
    open: boolean
    onToggle: () => void
    inspectors: Record<string, InspectorData>
}

function Effect({ effect, inspectors }: { effect: PublicBuildEffect; inspectors: Record<string, InspectorData> }) {
    if (effect.kind === 'text') return <>{effect.text}</>
    const data = effect.target ? inspectors[effect.target] : undefined
    const name = data ? <InspectorTrigger data={data} title={effect.name}>{effect.name}</InspectorTrigger> : effect.name
    if (effect.kind === 'ability') return <>{name}</>
    return (
        <>
            <span className="mr-1.5 text-xs text-muted-foreground">Bonus</span>
            {name}
        </>
    )
}

function Lines({ values, className }: { values: string[]; className?: string }) {
    return (
        <span className={cn('min-w-0', className)}>
            {values.map((value, i) => <span key={i} className="block truncate">{value}</span>)}
        </span>
    )
}

export default function BuildRow({ build, open, onToggle, inspectors }: Props) {
    const expandable = build.parts.length > 0
    const panelId = `build-${build.slug}-parts`
    const heights = [...new Set(build.combos.map(c => c.heightLabel))]

    return (
        <div
            id={`build-${build.slug}`}
            onClick={expandable ? onToggle : undefined}
            className={cn(
                'group -mx-3 scroll-mt-24 px-3 transition-colors duration-150 motion-reduce:transition-none',
                expandable && 'cursor-pointer',
                open ? 'bg-muted/30' : 'hover:bg-muted/30',
            )}
        >
            <div className={cn('grid grid-cols-2 items-baseline gap-x-4 gap-y-0.5 py-2 text-sm leading-5', BUILD_GRID)}>
                <button
                    type="button"
                    disabled={!expandable}
                    aria-expanded={expandable ? open : undefined}
                    aria-controls={expandable ? panelId : undefined}
                    className="text-left font-semibold text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-default"
                >
                    {build.name}
                </button>
                <Lines values={build.combos.map(c => c.physical)} className="order-3 text-muted-foreground md:order-none" />
                <Lines values={build.combos.map(c => c.technical)} className="order-4 text-muted-foreground md:order-none" />
                <Lines values={heights} className="order-2 text-right font-mono text-xs tabular-nums text-muted-foreground md:order-none md:text-left" />
                <span className="order-5 col-span-2 min-w-0 text-muted-foreground md:order-none md:col-span-1">
                    {build.effects.map((effect, i) => (
                        <span key={i} className="block">
                            <Effect effect={effect} inspectors={inspectors} />
                        </span>
                    ))}
                </span>
                <span
                    aria-hidden
                    className={cn(
                        'hidden whitespace-nowrap text-right text-xs font-medium text-muted-foreground transition-colors duration-150 group-hover:text-foreground motion-reduce:transition-none md:block',
                        !expandable && 'md:invisible',
                    )}
                >
                    {open ? 'See less' : 'See more'}
                </span>
            </div>

            {expandable && (
                <Collapse open={open}>
                    <div id={panelId} className="pb-4 pt-1 md:pl-[204px]">
                        {build.parts.map(part => (
                            <div key={`${part.role}:${part.name}`} className="grid gap-x-6 gap-y-1 py-1.5 md:grid-cols-[150px_minmax(0,560px)]">
                                <span className="text-sm leading-5">
                                    {part.href ? (
                                        <Link
                                            href={part.href}
                                            onClick={e => e.stopPropagation()}
                                            className="font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                        >
                                            {part.name}
                                        </Link>
                                    ) : (
                                        <span className="font-medium text-foreground">{part.name}</span>
                                    )}
                                    <span className="block text-xs text-muted-foreground">{part.role}</span>
                                </span>
                                <ul className="space-y-1 text-sm leading-5 text-muted-foreground">
                                    {part.wording.map((line, i) => <li key={i}>{line}</li>)}
                                </ul>
                            </div>
                        ))}
                    </div>
                </Collapse>
            )}
        </div>
    )
}
