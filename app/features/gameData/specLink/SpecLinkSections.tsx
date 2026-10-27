"use client"

import { useMemo, useState, type ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { isLeagueLinkSpec, type SpecLinkDecision, type SpecLinkItem, type SpecLinkPlan } from '@/server/domains/gameData/types/specLinks'
import { cn } from '@/lib/utils'
import SpecPickRow from './SpecPickRow'

interface SpecLinkSectionsProps {
    plan: SpecLinkPlan
    decisions: Record<string, SpecLinkDecision>
    onDecide: (gameKey: string, decision: SpecLinkDecision | undefined) => void
    restored: ReadonlySet<string>
    onRestore: (gameKey: string, restore: boolean) => void
    done: boolean
}

function Section({ title, count, aside, children }: { title: string; count?: number; aside?: ReactNode; children: ReactNode }) {
    return (
        <section>
            <h3 className="flex items-baseline gap-2 border-b border-border pb-2 text-sm font-semibold text-foreground">
                {title}
                {count !== undefined && <span className="font-mono text-xs font-normal tabular-nums text-muted-foreground">{count}</span>}
                {aside && <span className="ml-auto text-xs font-normal text-muted-foreground">{aside}</span>}
            </h3>
            {children}
        </section>
    )
}

function Fold({ label, children }: { label: ReactNode; children: ReactNode }) {
    const [open, setOpen] = useState(false)
    return (
        <div>
            <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpen(o => !o)}
                className="flex items-center gap-1 text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground motion-reduce:transition-none"
            >
                <ChevronRight aria-hidden className={cn('h-3.5 w-3.5 transition-transform duration-150 motion-reduce:transition-none', open && 'rotate-90')} />
                {label}
            </button>
            {open && <div className="mt-1.5 pl-5">{children}</div>}
        </div>
    )
}

function Count({ n, children }: { n: number; children: ReactNode }) {
    return <><span className="font-mono tabular-nums">{n}</span> {children}</>
}

function NameColumns({ names }: { names: string[] }) {
    return (
        <ul className="columns-2 gap-6 text-sm text-muted-foreground md:columns-3">
            {names.map(n => <li key={n}>{n}</li>)}
        </ul>
    )
}

export default function SpecLinkSections({ plan, decisions, onDecide, restored, onRestore, done }: SpecLinkSectionsProps) {
    const specById = useMemo(() => new Map(plan.specs.map(s => [s.id, s])), [plan.specs])
    const linkable = useMemo(() => {
        const keys = new Set(plan.items.map(i => i.gameKey))
        return plan.specs.filter(isLeagueLinkSpec).filter(s => s.game_key === null || !keys.has(s.game_key))
    }, [plan])
    const claims = useMemo(() => {
        const owners = new Map<string, string>()
        for (const d of Object.values(decisions)) if (d.action === 'link' && !owners.has(d.specId)) owners.set(d.specId, d.gameKey)
        return owners
    }, [decisions])

    const linked = plan.items.filter(i => i.status === 'linked')
    const linkedNames = linked.map(i => `${i.gameName} → ${specById.get(i.specId!)?.name ?? i.gameName}`)

    if (done) {
        const unlinked = plan.items.filter(i => i.status === 'ambiguous' || i.status === 'exact')
        const skipped = plan.items.filter(i => i.status === 'skipped')
        return (
            <Section title="Specs">
                <div className="mt-2.5 space-y-1.5">
                    {linked.length > 0 && <Fold label={<Count n={linked.length}>linked</Count>}><NameColumns names={linkedNames} /></Fold>}
                    {unlinked.length > 0 && <Fold label={<Count n={unlinked.length}>left unlinked</Count>}><NameColumns names={unlinked.map(i => i.gameName)} /></Fold>}
                    {skipped.length > 0 && <Fold label={<Count n={skipped.length}>skipped</Count>}><NameColumns names={skipped.map(i => i.gameName)} /></Fold>}
                </div>
            </Section>
        )
    }

    const proposed = plan.items.filter(i => i.status === 'exact')
    const toPick = plan.items.filter(i => i.status === 'ambiguous' || (i.status === 'skipped' && restored.has(i.gameKey)))
    const skippedEarlier = plan.items.filter(i => i.status === 'skipped' && !restored.has(i.gameKey))
    const left = toPick.filter(i => decisions[i.gameKey] === undefined).length

    function decidePick(item: SpecLinkItem, decision: SpecLinkDecision | undefined) {
        if (item.status === 'skipped' && decision?.action === 'skip') onRestore(item.gameKey, false)
        else onDecide(item.gameKey, decision)
    }

    const row = (item: SpecLinkItem, mode: 'pick' | 'proposed') => (
        <SpecPickRow
            key={item.gameKey}
            item={item}
            mode={mode}
            linkable={linkable}
            claims={claims}
            value={decisions[item.gameKey]}
            onChange={d => (mode === 'pick' ? decidePick(item, d) : onDecide(item.gameKey, d))}
        />
    )

    return (
        <div className="space-y-8">
            {toPick.length > 0 && (
                <Section
                    title="To pick"
                    count={toPick.length}
                    aside={left > 0 && <><span className="font-mono tabular-nums text-foreground">{left}</span> left</>}
                >
                    {toPick.map(i => row(i, 'pick'))}
                </Section>
            )}

            {proposed.length > 0 && (
                <Section title="Proposed" count={proposed.length}>
                    {proposed.map(i => row(i, 'proposed'))}
                </Section>
            )}

            {(plan.orphaned.length > 0 || skippedEarlier.length > 0 || linked.length > 0) && (
                <Section title="Also in this import">
                    <div className="mt-2.5 space-y-1.5">
                        {plan.orphaned.map(o => (
                            <p key={o.specId} className="text-sm text-muted-foreground">
                                <span aria-hidden className="mr-1.5 text-secondary">▲</span>
                                <span className="font-medium text-foreground">{o.name}</span> stays linked to game key “{o.gameKey}”, which is not in this paste.
                            </p>
                        ))}
                        {skippedEarlier.length > 0 && (
                            <Fold label={<Count n={skippedEarlier.length}>skipped earlier</Count>}>
                                <ul className="space-y-1 text-sm">
                                    {skippedEarlier.map(i => (
                                        <li key={i.gameKey} className="flex items-baseline gap-3">
                                            <span className="text-muted-foreground">{i.gameName}</span>
                                            <button
                                                type="button"
                                                onClick={() => onRestore(i.gameKey, true)}
                                                className="font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground motion-reduce:transition-none"
                                            >
                                                Restore
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </Fold>
                        )}
                        {linked.length > 0 && <Fold label={<Count n={linked.length}>already linked</Count>}><NameColumns names={linkedNames} /></Fold>}
                    </div>
                </Section>
            )}
        </div>
    )
}
