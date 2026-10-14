"use client"

import type { GameDatasetKind, StoredDatasetSummary } from '@/server/domains/gameData/types/datasets'
import { GAME_DATASET_KINDS } from '@/server/domains/gameData/types/datasets'
import { DATASET_LABELS } from '@/server/domains/gameData/helpers/datasets/registry'
import { cn } from '@/lib/utils'

function formatImportedAt(iso: string) {
    return new Date(iso).toLocaleString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
}

export default function StoredDatasetsStrip({ stored, selected, onSelect }: {
    stored: StoredDatasetSummary[]
    selected: GameDatasetKind | null
    onSelect: (kind: GameDatasetKind | null) => void
}) {
    const byKind = new Map(stored.map(s => [s.kind, s]))

    return (
        <div className="panel grid grid-cols-2 md:grid-cols-4">
            {GAME_DATASET_KINDS.map((kind, i) => {
                const s = byKind.get(kind)
                const active = selected === kind
                return (
                    <button
                        key={kind}
                        type="button"
                        disabled={!s}
                        aria-pressed={active}
                        onClick={() => onSelect(active ? null : kind)}
                        className={cn(
                            'p-4 text-left border-b-2 border-transparent transition-colors enabled:hover:bg-muted/30 disabled:cursor-default',
                            i > 0 && 'border-l border-l-border',
                            active && 'border-b-foreground',
                        )}
                    >
                        <p className={cn('text-xs font-semibold uppercase tracking-wider', active ? 'text-foreground' : 'text-muted-foreground')}>{DATASET_LABELS[kind]}</p>
                        {s ? (
                            <>
                                <p className="mt-1 font-mono text-lg tabular-nums">{s.count}</p>
                                <p className="text-xs text-muted-foreground tabular-nums" suppressHydrationWarning>{formatImportedAt(s.importedAt)}</p>
                            </>
                        ) : (
                            <p className="mt-1 text-sm text-muted-foreground">Not imported</p>
                        )}
                    </button>
                )
            })}
        </div>
    )
}
