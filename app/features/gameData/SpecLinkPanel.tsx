"use client"

import { useMemo, useState, type ReactNode } from 'react'
import { ChevronRight, CircleX, TriangleAlert } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { formatHeight } from '@/shared/utils/height'
import type { HeightChange, SpecLinkDecision, SpecLinkItem, SpecLinkPlan } from '@/server/domains/gameData/types/specLinks'
import SpecPicker from './SpecPicker'
import { cn } from '@/lib/utils'

interface SpecLinkPanelProps {
    plan: SpecLinkPlan
    decisions: Record<string, SpecLinkDecision>
    onDecide: (gameKey: string, decision: SpecLinkDecision | undefined) => void
    onAcceptAll: () => void
    heightChanges: HeightChange[]
    errors: string[]
}

function Group({ title, count, children }: { title: string; count: number; children: ReactNode }) {
    if (count === 0) return null
    return (
        <section className="space-y-1">
            <h4 className="flex items-baseline gap-2 border-b border-border pb-1.5 text-sm font-semibold text-foreground">
                {title}
                <span className="font-mono text-xs font-normal tabular-nums text-muted-foreground">{count}</span>
            </h4>
            <div className="divide-y divide-border/40">{children}</div>
        </section>
    )
}

function ProposedRow({ item, specName, decision, linkable, claims, onDecide }: {
    item: SpecLinkItem
    specName: string
    decision: SpecLinkDecision | undefined
    linkable: SpecLinkPlan['specs']
    claims: ReadonlyMap<string, string>
    onDecide: SpecLinkPanelProps['onDecide']
}) {
    const [choosing, setChoosing] = useState(false)
    const acceptedProposal = decision?.action === 'link' && decision.specId === item.specId

    return (
        <div className="py-2 space-y-2">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
                <span className="font-medium text-foreground">{item.gameName}</span>
                <span aria-hidden className="text-muted-foreground">→</span>
                <span className="text-foreground">{specName}</span>
                <span className="ml-auto flex items-baseline gap-3">
                    {decision === undefined && (
                        <Button size="sm" variant="ghost" className="h-7 rounded-sm text-primary" onClick={() => onDecide(item.gameKey, { gameKey: item.gameKey, action: 'link', specId: item.specId!, rename: false })}>
                            Accept
                        </Button>
                    )}
                    {acceptedProposal && <span className="text-muted-foreground">Accepted</span>}
                    {decision && !acceptedProposal && <span className="text-muted-foreground">Changed</span>}
                    {decision && (
                        <button type="button" className="text-sm text-muted-foreground underline decoration-border underline-offset-4 hover:text-foreground" onClick={() => { setChoosing(false); onDecide(item.gameKey, undefined) }}>
                            Undo
                        </button>
                    )}
                    <button type="button" aria-expanded={choosing} className="text-sm text-muted-foreground underline decoration-border underline-offset-4 hover:text-foreground" onClick={() => setChoosing(c => !c)}>
                        Pick another
                    </button>
                </span>
            </div>
            {choosing && (
                <div className="pl-4">
                    <SpecPicker item={item} linkable={linkable} claims={claims} value={decision} onChange={d => onDecide(item.gameKey, d)} />
                </div>
            )}
        </div>
    )
}

export default function SpecLinkPanel({ plan, decisions, onDecide, onAcceptAll, heightChanges, errors }: SpecLinkPanelProps) {
    const [showLinked, setShowLinked] = useState(false)
    const [showSkipped, setShowSkipped] = useState(false)
    const specById = useMemo(() => new Map(plan.specs.map(s => [s.id, s])), [plan.specs])
    const gameKeys = useMemo(() => new Set(plan.items.map(i => i.gameKey)), [plan.items])
    const linkable = useMemo(() => plan.specs.filter(s => s.game_key === null || !gameKeys.has(s.game_key)), [plan.specs, gameKeys])
    const claims = useMemo(() => {
        const owners = new Map<string, string>()
        for (const d of Object.values(decisions)) if (d.action === 'link' && !owners.has(d.specId)) owners.set(d.specId, d.gameKey)
        return owners
    }, [decisions])

    const linked = plan.items.filter(i => i.status === 'linked')
    const proposed = plan.items.filter(i => i.status === 'exact')
    const restored = (i: SpecLinkItem) => i.status === 'skipped' && decisions[i.gameKey] !== undefined && decisions[i.gameKey].action !== 'skip'
    const toPick = plan.items.filter(i => i.status === 'ambiguous' || restored(i))
    const skippedRows = plan.items.filter(i => i.status === 'skipped' && !restored(i))
    const pendingProposals = proposed.filter(i => decisions[i.gameKey] === undefined).length
    const pendingPicks = toPick.filter(i => decisions[i.gameKey] === undefined).length

    return (
        <div className="panel p-4 space-y-5">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <h3 className="font-semibold">Link specs</h3>
                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                    {toPick.length} to pick · {proposed.length} proposed · {linked.length} linked · {skippedRows.length} skipped
                </span>
                <span className="ml-auto flex items-center gap-3">
                    {pendingPicks > 0 && pendingProposals > 0 && (
                        <span className="text-sm text-muted-foreground">
                            Pick the <span className="font-mono tabular-nums">{pendingPicks}</span> above first
                        </span>
                    )}
                    <Button size="sm" className="rounded-sm" disabled={pendingProposals === 0 || pendingPicks > 0} onClick={onAcceptAll}>
                        Accept all ({pendingProposals})
                    </Button>
                </span>
            </div>

            {heightChanges.length > 0 && (
                <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">Height changes on publish</p>
                    <ul className="flex flex-wrap gap-x-6 gap-y-0.5 text-sm">
                        {heightChanges.map(c => (
                            <li key={c.specId}>
                                {c.name} <span className="font-mono tabular-nums text-muted-foreground">{formatHeight(c.from)} → </span>
                                <span className="font-mono tabular-nums text-foreground">{formatHeight(c.to)}</span>
                            </li>
                        ))}
                    </ul>
                    <p className="text-xs text-muted-foreground">Heights update the spec now. The public page shows them after the next snapshot publish.</p>
                </div>
            )}

            {errors.length > 0 && (
                <ul role="alert" className="space-y-1">
                    {errors.map(e => (
                        <li key={e} className="flex items-start gap-2 text-sm text-destructive">
                            <CircleX className="h-4 w-4 mt-0.5 shrink-0" />
                            {e}
                        </li>
                    ))}
                </ul>
            )}

            <Group title="To pick" count={toPick.length}>
                {toPick.map(item => (
                    <div key={item.gameKey} className="py-2.5 space-y-2">
                        <p className="flex items-baseline gap-2 text-sm">
                            <span className="font-medium text-foreground">{item.gameName}</span>
                            <span className="font-mono text-xs tabular-nums text-muted-foreground">{formatHeight(item.height)}</span>
                            {decisions[item.gameKey] === undefined && <span className="h-1.5 w-1.5 rounded-full bg-secondary" aria-label="Needs a decision" />}
                            {item.status === 'skipped' && (
                                <span className="ml-auto flex items-baseline gap-3 text-muted-foreground">
                                    Restored
                                    <button type="button" className="underline decoration-border underline-offset-4 hover:text-foreground" onClick={() => onDecide(item.gameKey, undefined)}>
                                        Skip again
                                    </button>
                                </span>
                            )}
                        </p>
                        <SpecPicker item={item} linkable={linkable} claims={claims} value={decisions[item.gameKey]} onChange={d => onDecide(item.gameKey, d ?? (item.status === 'skipped' ? { gameKey: item.gameKey, action: 'leave' } : undefined))} />
                    </div>
                ))}
            </Group>

            <Group title="Proposed" count={proposed.length}>
                {proposed.map(item => (
                    <ProposedRow
                        key={item.gameKey}
                        item={item}
                        specName={specById.get(item.specId!)?.name ?? item.gameName}
                        decision={decisions[item.gameKey]}
                        linkable={linkable}
                        claims={claims}
                        onDecide={onDecide}
                    />
                ))}
            </Group>

            {skippedRows.length > 0 && (
                <div>
                    <button
                        type="button"
                        aria-expanded={showSkipped}
                        onClick={() => setShowSkipped(s => !s)}
                        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                    >
                        <ChevronRight aria-hidden className={cn('h-3.5 w-3.5 transition-transform duration-150 motion-reduce:transition-none', showSkipped && 'rotate-90')} />
                        {skippedRows.length} skipped
                    </button>
                    {showSkipped && (
                        <ul className="mt-1 space-y-1 pl-5 text-sm">
                            {skippedRows.map(i => (
                                <li key={i.gameKey} className="flex items-baseline gap-3">
                                    <span className="text-muted-foreground">{i.gameName}</span>
                                    <button type="button" className="text-muted-foreground underline decoration-border underline-offset-4 hover:text-foreground" onClick={() => onDecide(i.gameKey, { gameKey: i.gameKey, action: 'leave' })}>
                                        Restore
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            {plan.orphaned.length > 0 && (
                <ul className="space-y-1">
                    {plan.orphaned.map(o => (
                        <li key={o.specId} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <TriangleAlert className="h-4 w-4 mt-0.5 shrink-0" />
                            <span><span className="font-medium text-foreground">{o.name}</span> stays linked to game key “{o.gameKey}”, which is not in this paste.</span>
                        </li>
                    ))}
                </ul>
            )}

            {linked.length > 0 && (
                <div>
                    <button
                        type="button"
                        aria-expanded={showLinked}
                        onClick={() => setShowLinked(s => !s)}
                        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                    >
                        <ChevronRight aria-hidden className={cn('h-3.5 w-3.5 transition-transform duration-150 motion-reduce:transition-none', showLinked && 'rotate-90')} />
                        {linked.length} already linked
                    </button>
                    {showLinked && (
                        <ul className="mt-1 columns-2 gap-6 pl-5 text-sm text-muted-foreground md:columns-3">
                            {linked.map(i => <li key={i.gameKey}>{i.gameName} → {specById.get(i.specId!)?.name}</li>)}
                        </ul>
                    )}
                </div>
            )}
        </div>
    )
}
