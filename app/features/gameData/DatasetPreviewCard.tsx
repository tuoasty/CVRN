"use client"

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Badge } from '@/app/components/ui/badge'
import { Input } from '@/app/components/ui/input'
import type { Ability, AttributeEntry, PreviewDataset, Rarity } from '@/server/domains/gameData'
import { DATASET_LABELS } from '@/server/domains/gameData'
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
                    {errors > 0 && <span className="text-destructive tabular-nums">{errors} error{errors === 1 ? '' : 's'}</span>}
                    {warnings > 0 && <span className="text-muted-foreground tabular-nums">{warnings} warning{warnings === 1 ? '' : 's'}</span>}
                    <span className="font-mono tabular-nums">{dataset.count} entries</span>
                </span>
            </button>

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

    return (
        <div>
            <div className="p-3 border-b border-border">
                <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Filter abilities" className="h-8 max-w-xs rounded-sm" />
            </div>
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-border">
                        <th className={TH}>Ability</th>
                        <th className={TH}>Kind</th>
                        <th className={cn(TH, 'text-right')}>Effects</th>
                        <th className={cn(TH, 'text-right')}>Params</th>
                        <th className={TH}>Description</th>
                    </tr>
                </thead>
                <tbody>
                    {shown.map(a => (
                        <AbilityRow
                            key={a.key}
                            ability={a}
                            expanded={expanded === a.key}
                            onToggle={() => setExpanded(e => (e === a.key ? null : a.key))}
                        />
                    ))}
                </tbody>
            </table>
        </div>
    )
}

function AbilityRow({ ability, expanded, onToggle }: { ability: Ability; expanded: boolean; onToggle: () => void }) {
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
                <td className={cn(TD, 'font-medium whitespace-nowrap')}>{ability.key}</td>
                <td className={TD}>
                    <span className="flex flex-wrap gap-1">
                        {kinds.map(k => (
                            <Badge key={k} variant="outline" className="rounded-sm text-xs uppercase">{k}</Badge>
                        ))}
                    </span>
                </td>
                <td className={cn(TD, NUM)}>{ability.effects.length || ''}</td>
                <td className={cn(TD, NUM)}>{Object.keys(ability.params).length || ''}</td>
                <td className={cn(TD, 'max-w-md', ability.description ? 'line-clamp-2' : 'text-muted-foreground')}>
                    {ability.description ?? 'No description'}
                </td>
            </tr>
            {expanded && (
                <tr className="border-b border-border bg-muted/20">
                    <td colSpan={5} className="px-4 py-3">
                        <pre className="font-mono text-xs whitespace-pre-wrap">{JSON.stringify(ability, null, 2)}</pre>
                    </td>
                </tr>
            )}
        </>
    )
}
