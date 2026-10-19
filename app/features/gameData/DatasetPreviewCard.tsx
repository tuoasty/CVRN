"use client"

import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import type { DatasetDiff } from '@/server/domains/gameData/types/datasets'
import type { PreviewDataset } from '@/server/domains/gameData/types/preview'
import { DATASET_LABELS } from '@/server/domains/gameData/helpers/datasets/registry'
import IssueList from './IssueList'
import { AbilityTable, AttributeTable, RarityTable, SpecLoadoutTable, type AttributeLinks } from './DatasetTables'
import { cn } from '@/lib/utils'

export function diffParts(diff: DatasetDiff): string {
    return [
        diff.added.length > 0 && `${diff.added.length} added`,
        diff.removed.length > 0 && `${diff.removed.length} removed`,
        diff.changed.length > 0 && `${diff.changed.length} changed`,
        diff.reordered && 'reordered',
    ].filter(Boolean).join(', ')
}

export default function DatasetPreviewCard({ dataset, links }: { dataset: PreviewDataset; links: AttributeLinks }) {
    const [open, setOpen] = useState(false)
    const errors = dataset.issues.filter(i => i.level === 'error').length
    const warnings = dataset.issues.length - errors

    return (
        <div>
            <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpen(o => !o)}
                className="grid w-full grid-cols-[16px_170px_260px_96px_1fr_max-content] items-baseline gap-x-3.5 py-2 text-left text-sm transition-colors duration-150 hover:text-foreground motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
                <ChevronRight aria-hidden className={cn('h-3.5 w-3.5 self-center text-muted-foreground transition-transform duration-150 motion-reduce:transition-none', open && 'rotate-90')} />
                <span className="font-semibold text-foreground">{DATASET_LABELS[dataset.kind]}</span>
                <span className="truncate font-mono text-xs tabular-nums text-muted-foreground">{dataset.root} · line {dataset.line}</span>
                <span className="font-mono text-xs tabular-nums text-foreground">{dataset.count} entries</span>
                <span className="text-muted-foreground">
                    {!dataset.diff ? 'New, nothing stored yet' : dataset.diff.unchanged ? 'Unchanged' : diffParts(dataset.diff)}
                </span>
                <span className="flex gap-3 text-xs">
                    {errors > 0 && <span className="text-destructive"><span className="font-mono tabular-nums">{errors}</span> error{errors === 1 ? '' : 's'}</span>}
                    {warnings > 0 && <span className="text-secondary"><span className="font-mono tabular-nums">{warnings}</span> warning{warnings === 1 ? '' : 's'}</span>}
                </span>
            </button>

            {open && (
                <div className="space-y-3 pb-4 pl-[30px]">
                    {dataset.diff && !dataset.diff.unchanged && <DiffDetail diff={dataset.diff} />}
                    <IssueList issues={dataset.issues} />
                    {dataset.kind === 'rarities' && <RarityTable rarities={dataset.payload} />}
                    {(dataset.kind === 'physicals' || dataset.kind === 'technicals') && <AttributeTable entries={dataset.payload} links={links} />}
                    {dataset.kind === 'abilities' && <AbilityTable abilities={dataset.payload} links={links} />}
                    {dataset.kind === 'specLoadouts' && <SpecLoadoutTable loadouts={dataset.payload} links={links} />}
                </div>
            )}
        </div>
    )
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
                    <dt className="w-20 shrink-0 pt-0.5 text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">{r.label}</dt>
                    <dd className={cn(r.removed && 'text-destructive')}>{r.keys.join(', ')}</dd>
                </div>
            ))}
            {diff.reordered && <p className="text-muted-foreground">Entry order changed.</p>}
        </dl>
    )
}
