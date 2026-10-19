"use client"

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { InspectorData, PublicKitEntry, PublicSpecKit } from '@/server/domains/gameData'
import InspectorContent from '../inspector/InspectorContent'
import InspectorTrigger from '../inspector/InspectorTrigger'
import { useHoverCapable } from '../inspector/useHoverCapable'

interface Props {
    kit: PublicSpecKit
    inspectors: Record<string, InspectorData>
}

function entryId(entry: PublicKitEntry, index: number): string {
    return `${entry.slot}:${index}:${entry.name}`
}

export default function SpecKit({ kit, inspectors }: Props) {
    const dock = useHoverCapable()
    const sections = [
        { slot: 'Active' as const, entries: kit.active ?? [] },
        { slot: 'Passive' as const, entries: kit.passive ?? [] },
    ].filter(s => s.entries.length > 0)

    const keyed = sections.flatMap(s => s.entries.map((entry, i) => ({ id: entryId(entry, i), entry })))
    const firstTarget = keyed.find(k => k.entry.slot === 'Active' && k.entry.target) ?? keyed.find(k => k.entry.target)

    const [selected, setSelected] = useState<string | null>(null)
    const shownId = selected ?? firstTarget?.id ?? null
    const shown = keyed.find(k => k.id === shownId)?.entry
    const shownData = shown?.target ? shown.tuned ?? inspectors[shown.target] : undefined

    if (sections.length === 0) return null

    return (
        <div className={cn(dock && 'grid grid-cols-[260px_minmax(0,1fr)] gap-8')}>
            <div>
                {sections.map((section, s) => (
                    <section key={section.slot} className={s > 0 ? 'mt-8' : undefined}>
                        <h3 className="mb-2 text-lg font-semibold tracking-[-0.01em] text-foreground">{section.slot}</h3>
                        <ul>
                            {section.entries.map((entry, i) => {
                                const id = entryId(entry, i)
                                const data = entry.target ? entry.tuned ?? inspectors[entry.target] : undefined
                                if (!data) {
                                    return <li key={id} className="py-1 text-sm text-muted-foreground">{entry.name}</li>
                                }
                                if (!dock) {
                                    return (
                                        <li key={id} className="py-1 text-sm font-medium">
                                            <InspectorTrigger data={data} title={entry.name}>{entry.name}</InspectorTrigger>
                                        </li>
                                    )
                                }
                                const active = id === shownId
                                return (
                                    <li key={id}>
                                        <button
                                            type="button"
                                            onClick={() => setSelected(id)}
                                            aria-pressed={active}
                                            className={cn(
                                                '-mx-2.5 block w-[calc(100%+20px)] px-2.5 py-1 text-left text-sm font-medium transition-colors duration-150 motion-reduce:transition-none',
                                                'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/50',
                                                active ? 'bg-muted/45 text-foreground' : 'text-foreground hover:bg-muted/30',
                                            )}
                                        >
                                            <span className={cn(active && 'underline decoration-2 underline-offset-4')}>{entry.name}</span>
                                        </button>
                                    </li>
                                )
                            })}
                        </ul>
                    </section>
                ))}
            </div>

            {dock && shown && shownData && (
                <div aria-live="polite" className="self-start">
                    <InspectorContent data={shownData} title={shown.name} />
                </div>
            )}
        </div>
    )
}
