"use client"

import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Badge } from '@/app/components/ui/badge'
import { Input } from '@/app/components/ui/input'
import type { Ability, AbilityBullet, AbilityLookup, AttributeEntry, DatasetDiff, PreviewDataset, Rarity } from '@/server/domains/gameData'
import { DATASET_LABELS, createAbilityLookup, describeAbility } from '@/server/domains/gameData'
import IssueList from './IssueList'
import { cn } from '@/lib/utils'

export default function DatasetPreviewCard({ dataset }: { dataset: PreviewDataset }) {
    const [open, setOpen] = useState(false)
    const errors = dataset.issues.filter(i => i.level === 'error').length
    const warnings = dataset.issues.length - errors

    return (
        <div className="panel">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="flex w-full items-center gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
            >
                {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                <span className="font-semibold">{DATASET_LABELS[dataset.kind]}</span>
                <span className="font-mono text-xs text-muted-foreground">{dataset.root}</span>
                <span className="font-mono text-xs text-muted-foreground tabular-nums">line {dataset.line}</span>
                <span className="ml-auto flex items-center gap-3 text-sm">
                    <DiffLabel diff={dataset.diff} />
                    {errors > 0 && <span className="text-destructive tabular-nums">{errors} error{errors === 1 ? '' : 's'}</span>}
                    {warnings > 0 && <span className="text-muted-foreground tabular-nums">{warnings} warning{warnings === 1 ? '' : 's'}</span>}
                    <span className="font-mono tabular-nums">{dataset.count} entries</span>
                </span>
            </button>

            {dataset.diff && !dataset.diff.unchanged && (
                <div className="border-t border-border px-4 py-3">
                    <DiffDetail diff={dataset.diff} />
                </div>
            )}

            {dataset.issues.length > 0 && (
                <div className="border-t border-border px-4 py-3">
                    <IssueList issues={dataset.issues} />
                </div>
            )}

            {open && (
                <div className="border-t border-border">
                    {dataset.kind === 'rarities' && <RarityTable rarities={dataset.payload} />}
                    {(dataset.kind === 'physicals' || dataset.kind === 'technicals') && <AttributeTable entries={dataset.payload} />}
                    {dataset.kind === 'abilities' && <AbilityTable abilities={dataset.payload} />}
                </div>
            )}
        </div>
    )
}

function DiffLabel({ diff }: { diff: DatasetDiff | null }) {
    if (!diff) return <span className="text-primary">New</span>
    if (diff.unchanged) return <span className="text-muted-foreground">No changes</span>
    const parts = [
        diff.added.length > 0 && `${diff.added.length} added`,
        diff.removed.length > 0 && `${diff.removed.length} removed`,
        diff.changed.length > 0 && `${diff.changed.length} changed`,
        diff.reordered && 'reordered',
    ].filter(Boolean)
    return <span className="tabular-nums">{parts.join(', ')}</span>
}

function DiffDetail({ diff }: { diff: DatasetDiff }) {
    const rows = [
        { label: 'Added', keys: diff.added },
        { label: 'Removed', keys: diff.removed, removed: true },
        { label: 'Changed', keys: diff.changed },
    ].filter(r => r.keys.length > 0)

    return (
        <dl className="space-y-1 text-sm">
            {rows.map(r => (
                <div key={r.label} className="flex gap-3">
                    <dt className="w-20 shrink-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-0.5">{r.label}</dt>
                    <dd className={cn(r.removed && 'text-destructive')}>{r.keys.join(', ')}</dd>
                </div>
            ))}
            {diff.reordered && <p className="text-muted-foreground">Entry order changed.</p>}
        </dl>
    )
}

const TH = 'px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground'
const TD = 'px-4 py-2 align-top'
const NUM = 'font-mono tabular-nums text-right'

function RarityTable({ rarities }: { rarities: Rarity[] }) {
    return (
        <table className="w-full text-sm">
            <thead>
                <tr className="border-b border-border">
                    <th className={TH}>Name</th>
                    <th className={TH}>Color</th>
                    <th className={cn(TH, 'text-right')}>Weight</th>
                    <th className={cn(TH, 'text-right')}>Normal %</th>
                    <th className={cn(TH, 'text-right')}>Lucky %</th>
                </tr>
            </thead>
            <tbody>
                {rarities.map(r => (
                    <tr key={r.name} className="border-b border-border last:border-b-0">
                        <td className={cn(TD, 'font-medium')}>{r.name}</td>
                        <td className={TD}>
                            <span className="inline-flex items-center gap-2 font-mono text-xs">
                                <span className="h-3 w-3 border border-border" style={{ backgroundColor: r.color }} />
                                {r.color}
                            </span>
                        </td>
                        <td className={cn(TD, NUM)}>{r.weight}</td>
                        <td className={cn(TD, NUM)}>{r.normalPct}</td>
                        <td className={cn(TD, NUM)}>{r.luckyPct}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    )
}

function AttributeTable({ entries }: { entries: AttributeEntry[] }) {
    return (
        <table className="w-full text-sm">
            <thead>
                <tr className="border-b border-border">
                    <th className={TH}>Value</th>
                    <th className={cn(TH, 'text-right')}>Weight</th>
                </tr>
            </thead>
            <tbody>
                {entries.map(e => (
                    <tr key={e.value} className="border-b border-border last:border-b-0">
                        <td className={cn(TD, e.value === 'None' && 'text-muted-foreground')}>{e.value}</td>
                        <td className={cn(TD, NUM)}>{e.weight}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    )
}

function AbilityTable({ abilities }: { abilities: Ability[] }) {
    const [query, setQuery] = useState('')
    const [expanded, setExpanded] = useState<string | null>(null)
    const q = query.trim().toLowerCase()
    const shown = q ? abilities.filter(a => a.key.toLowerCase().includes(q)) : abilities
    const lookup = useMemo(() => createAbilityLookup(abilities), [abilities])

    return (
        <div>
            <div className="p-3 border-b border-border">
                <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Filter abilities" className="h-8 max-w-xs rounded-sm" />
            </div>
            <table className="w-full table-fixed text-sm">
                <colgroup>
                    <col className="w-40" />
                    <col className="w-24" />
                    <col className="w-16" />
                    <col className="w-16" />
                    <col />
                </colgroup>
                <thead>
                    <tr className="border-b border-border">
                        <th className={TH}>Ability</th>
                        <th className={cn(TH, 'px-2')}>Kind</th>
                        <th className={cn(TH, 'px-2 text-right')}>Eff.</th>
                        <th className={cn(TH, 'px-2 text-right')}>Par.</th>
                        <th className={TH}>Description</th>
                    </tr>
                </thead>
                <tbody>
                    {shown.map(a => (
                        <AbilityRow
                            key={a.key}
                            ability={a}
                            lookup={lookup}
                            expanded={expanded === a.key}
                            onToggle={() => setExpanded(e => (e === a.key ? null : a.key))}
                        />
                    ))}
                </tbody>
            </table>
        </div>
    )
}

function BulletList({ bullets }: { bullets: AbilityBullet[] }) {
    if (bullets.length === 0) return <span className="text-muted-foreground">No description</span>
    return (
        <ul className="list-disc pl-4 space-y-0.5">
            {bullets.map((b, i) => (
                <li key={i} className={cn(!b.mapped && 'text-destructive')}>
                    {b.text}
                    {b.guess && <span className="ml-2 text-xs text-muted-foreground">(guess)</span>}
                    {b.grants && !b.children && <span className="ml-2 text-xs text-destructive">(not in catalog)</span>}
                    {b.children && b.children.length > 0 && (
                        <div className="mt-0.5 text-muted-foreground">
                            <BulletList bullets={b.children} />
                        </div>
                    )}
                </li>
            ))}
        </ul>
    )
}

function AbilityRow({ ability, lookup, expanded, onToggle }: { ability: Ability; lookup: AbilityLookup; expanded: boolean; onToggle: () => void }) {
    const bullets = useMemo(() => describeAbility(ability, lookup), [ability, lookup])
    const kinds = [
        ability.active && 'Active',
        ability.toggle && 'Toggle',
        ability.team && 'Team',
        ability.aura && 'Aura',
        ability.extra && 'Extra',
    ].filter((k): k is string => !!k)

    return (
        <>
            <tr onClick={onToggle} className="cursor-pointer border-b border-border hover:bg-muted/30">
                <td className={cn(TD, 'font-medium break-words')}>{ability.key}</td>
                <td className={cn(TD, 'px-2')}>
                    <span className="flex flex-wrap gap-1">
                        {kinds.map(k => (
                            <Badge key={k} variant="outline" className="rounded-sm text-xs uppercase">{k}</Badge>
                        ))}
                    </span>
                </td>
                <td className={cn(TD, NUM, 'px-2')}>{ability.effects.length || ''}</td>
                <td className={cn(TD, NUM, 'px-2')}>{Object.keys(ability.params).length || ''}</td>
                <td className={TD}>
                    {ability.description
                        ? <span>{ability.description}</span>
                        : <BulletList bullets={bullets} />}
                </td>
            </tr>
            {expanded && (
                <tr className="border-b border-border bg-muted/20">
                    <td colSpan={5} className="px-4 py-3 space-y-3">
                        {ability.description && (
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Generated wording</p>
                                <BulletList bullets={bullets} />
                            </div>
                        )}
                        <pre className="font-mono text-xs whitespace-pre-wrap">{JSON.stringify(ability, null, 2)}</pre>
                    </td>
                </tr>
            )}
        </>
    )
}
