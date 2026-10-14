"use client"

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { DatasetDiff } from '@/server/domains/gameData/types/datasets'
import type { PreviewDataset } from '@/server/domains/gameData/types/preview'
import { DATASET_LABELS } from '@/server/domains/gameData/helpers/datasets/registry'
import IssueList from './IssueList'
import { AbilityTable, AttributeTable, RarityTable, type AttributeLinks } from './DatasetTables'
import { cn } from '@/lib/utils'

export default function DatasetPreviewCard({ dataset, links }: { dataset: PreviewDataset; links: AttributeLinks }) {
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
                    {(dataset.kind === 'physicals' || dataset.kind === 'technicals') && <AttributeTable entries={dataset.payload} links={links} />}
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
