"use client"

import { useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type { InspectorData, PublicKitEntry, PublicSpecKit } from '@/server/domains/gameData'
import InspectorContent from '../inspector/InspectorContent'
import InspectorTrigger from '../inspector/InspectorTrigger'
import { useHoverCapable } from '../inspector/useHoverCapable'

interface Props {
    kit: PublicSpecKit
    inspectors: Record<string, InspectorData>
    header?: ReactNode
    split?: boolean
}

const LONG_SECTION = 12

export function SpecSplit({ header, list, detail }: { header: ReactNode; list: ReactNode; detail?: ReactNode }) {
    return (
        <div
            className={cn(
                'grid grid-cols-[260px_minmax(0,1fr)] gap-x-10 gap-y-8 [grid-template-areas:"header_header"_"list_detail"]',
                'min-[1200px]:grid-cols-[minmax(0,340px)_minmax(0,1fr)] min-[1200px]:grid-rows-[auto_1fr] min-[1200px]:[grid-template-areas:"header_list"_"detail_list"]',
            )}
        >
            <div className="min-w-0 [grid-area:header]">{header}</div>
            <div className="min-w-0 self-start [grid-area:list]">
                {list ?? <p className="text-sm text-muted-foreground">No abilities</p>}
            </div>
            {detail && <div aria-live="polite" className="min-w-0 self-start [grid-area:detail]">{detail}</div>}
        </div>
    )
}

function entryId(entry: PublicKitEntry, index: number): string {
    return `${entry.slot}:${index}:${entry.name}`
}

export default function SpecKit({ kit, inspectors, header, split = false }: Props) {
    const dock = useHoverCapable()
    const sections = [
        { slot: 'Active' as const, entries: kit.active ?? [] },
        { slot: 'Passive' as const, entries: kit.passive ?? [] },
    ].filter(s => s.entries.length > 0)
    const styles = kit.styles ?? []

    const keyed = sections.flatMap(s => s.entries.map((entry, i) => ({ id: entryId(entry, i), entry })))
    const firstTarget = keyed.find(k => k.entry.slot === 'Active' && k.entry.target) ?? keyed.find(k => k.entry.target)

    const [selected, setSelected] = useState<string | null>(null)
    const shownId = selected ?? firstTarget?.id ?? null
    const shown = keyed.find(k => k.id === shownId)?.entry
    const shownData = shown?.target ? shown.tuned ?? inspectors[shown.target] : undefined

    if (sections.length === 0 && styles.length === 0) return split ? <SpecSplit header={header} list={null} /> : null

    const list = (
        <div>
            {sections.map((section, s) => (
                <section key={section.slot} className={s > 0 ? 'mt-8' : undefined}>
                    <h3 className="mb-2 text-lg font-semibold tracking-[-0.01em] text-foreground">{section.slot}</h3>
                    <ul className={cn(split && section.entries.length > LONG_SECTION && 'min-[1200px]:columns-2 min-[1200px]:gap-8')}>
                        {section.entries.map((entry, i) => {
                            const id = entryId(entry, i)
                            const data = entry.target ? entry.tuned ?? inspectors[entry.target] : undefined
                            if (!data) {
                                return <li key={id} className="break-inside-avoid py-1 text-sm text-muted-foreground">{entry.name}</li>
                            }
                            if (!dock) {
                                return (
                                    <li key={id} className="break-inside-avoid py-1 text-sm font-medium">
                                        <InspectorTrigger data={data} title={entry.name}>{entry.name}</InspectorTrigger>
                                    </li>
                                )
                            }
                            const active = id === shownId
                            return (
                                <li key={id} className="break-inside-avoid">
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
            {styles.length > 0 && (
                <section className={sections.length > 0 ? 'mt-8' : undefined}>
                    <h3 className="mb-2 text-lg font-semibold tracking-[-0.01em] text-foreground">Serve styles</h3>
                    <ul>
                        {styles.map(style => (
                            <li key={style.name} className="break-inside-avoid py-1 text-sm">
                                <span className="font-medium text-foreground">{style.name}</span>
                                {style.text && (
                                    <span className="block text-muted-foreground">
                                        {style.text}
                                        {style.regular && ` (regular roll ${style.regular})`}
                                    </span>
                                )}
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </div>
    )

    const detail = dock && shown && shownData
        ? <InspectorContent data={shownData} title={shown.name} />
        : null

    if (split && !dock) {
        return (
            <div className="space-y-8">
                {header}
                {list}
            </div>
        )
    }

    if (split) return <SpecSplit header={header} list={list} detail={detail} />

    return (
        <div className={cn(dock && 'grid grid-cols-[260px_minmax(0,1fr)] gap-8')}>
            {list}
            {detail && (
                <div aria-live="polite" className="self-start">
                    {detail}
                </div>
            )}
        </div>
    )
}
