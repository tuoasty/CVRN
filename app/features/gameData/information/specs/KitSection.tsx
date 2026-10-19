"use client"

import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { kitTarget, type KitEntry, type ResolvedTune } from '@/server/domains/gameData/helpers/specLoadouts/resolveKit'
import { indexLabel, tuneNotes } from '@/server/domains/gameData/helpers/specLoadouts/loadoutView'
import { cn } from '@/lib/utils'
import AbilityLines from '../AbilityLines'
import { useInformation } from '../InformationProvider'

const TWO_COLUMNS_FROM = 12

interface KitSectionProps {
    title: string
    hint?: string
    entries: KitEntry[]
    tunes: ResolvedTune[]
}

export default function KitSection({ title, hint, entries, tunes }: KitSectionProps) {
    const [open, setOpen] = useState<Set<number>>(new Set())
    const twoColumns = entries.length > TWO_COLUMNS_FROM

    function toggle(i: number) {
        setOpen(current => {
            const next = new Set(current)
            if (next.has(i)) next.delete(i)
            else next.add(i)
            return next
        })
    }

    return (
        <section className="mt-8">
            <h3 className="flex items-baseline gap-2 border-b border-border pb-2 text-sm font-semibold text-foreground">
                {title}
                <span className="font-mono text-xs font-normal tabular-nums text-muted-foreground">{entries.length}</span>
                {hint && <span className="text-xs font-normal text-muted-foreground">{hint}</span>}
            </h3>
            <div className={cn('mt-1', twoColumns && 'grid grid-cols-2 gap-x-8')}>
                {entries.map((entry, i) => (
                    <KitRow
                        key={`${entry.name}-${i}`}
                        entry={entry}
                        tunes={tunes}
                        open={open.has(i)}
                        wide={twoColumns && open.has(i)}
                        onToggle={() => toggle(i)}
                    />
                ))}
            </div>
        </section>
    )
}

function KitRow({ entry, tunes, open, wide, onToggle }: { entry: KitEntry; tunes: ResolvedTune[]; open: boolean; wide: boolean; onToggle: () => void }) {
    const { abilityByKey, index } = useInformation()
    const target = kitTarget(entry)
    const ability = target ? abilityByKey.get(target) : undefined
    const indexEntry = target ? index.get(target) : undefined
    const notes = target ? tuneNotes(tunes, entry.slot, target) : null
    const tuned = notes !== null && (notes.byEffect.size > 0 || notes.other.length > 0)
    const name = entry.tier === 'variant' ? entry.base : entry.name

    const content = (
        <>
            <span className="min-w-0">
                <span className="font-medium text-foreground">{name}</span>
                {tuned && <span className="ml-2.5 text-xs text-secondary">tuned</span>}
                {entry.tier === 'variant' && <span className="ml-2.5 font-mono text-xs tabular-nums text-muted-foreground">{entry.modifier}</span>}
                {indexEntry?.variantOf && <span className="ml-2.5 text-xs text-muted-foreground">variant of {indexEntry.variantOf}</span>}
            </span>
            <span className="text-xs text-muted-foreground">{indexLabel(indexEntry)}</span>
        </>
    )

    return (
        <div className={cn(wide && 'col-span-2')}>
            {ability ? (
                <button
                    type="button"
                    aria-expanded={open}
                    onClick={onToggle}
                    className="grid w-full grid-cols-[14px_1fr_max-content] items-baseline gap-x-2.5 rounded-sm py-1.5 text-left text-sm transition-colors duration-150 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 motion-reduce:transition-none"
                >
                    <ChevronRight aria-hidden className={cn('h-3.5 w-3.5 translate-y-0.5 text-muted-foreground transition-transform duration-150 motion-reduce:transition-none', open && 'rotate-90')} />
                    {content}
                </button>
            ) : (
                <div className="grid grid-cols-[14px_1fr_max-content] items-baseline gap-x-2.5 py-1.5 text-sm">
                    <span />
                    {content}
                </div>
            )}
            {open && ability && notes && (
                <div className="pb-3 pl-6">
                    {notes.other.map(n => <p key={n} className="text-xs text-secondary">{n}</p>)}
                    <AbilityLines ability={ability} effectNotes={notes.byEffect} />
                </div>
            )}
        </div>
    )
}
