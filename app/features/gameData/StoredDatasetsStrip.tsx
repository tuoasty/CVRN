"use client"

import type { GameDatasetKind, StoredDatasetSummary } from '@/server/domains/gameData/types/datasets'
import { GAME_DATASET_KINDS } from '@/server/domains/gameData/types/datasets'
import { DATASET_LABELS } from '@/server/domains/gameData/helpers/datasets/registry'
import { cn } from '@/lib/utils'

function formatImportedAt(iso: string) {
    return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
}

export default function StoredDatasetsStrip({ stored, selected, onSelect }: {
    stored: StoredDatasetSummary[]
    selected: GameDatasetKind | null
    onSelect: (kind: GameDatasetKind | null) => void
}) {
    const byKind = new Map(stored.map(s => [s.kind, s]))

    return (
        <div className="mt-2.5 grid grid-cols-2 gap-x-5 gap-y-3 md:grid-cols-5">
            {GAME_DATASET_KINDS.map(kind => {
                const s = byKind.get(kind)
                const active = selected === kind
                return (
                    <button
                        key={kind}
                        type="button"
                        disabled={!s}
                        aria-pressed={active}
                        onClick={() => onSelect(active ? null : kind)}
                        className="group py-1 text-left disabled:cursor-default focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    >
                        <p className={cn(
                            'text-xs font-semibold uppercase tracking-[0.05em] transition-colors duration-150 motion-reduce:transition-none',
                            active ? 'text-foreground underline decoration-2 underline-offset-[6px]' : 'text-muted-foreground group-enabled:group-hover:text-foreground',
                        )}>
                            {DATASET_LABELS[kind]}
                        </p>
                        {s ? (
                            <>
                                <p className="mt-1 font-mono text-sm tabular-nums text-foreground">{s.count}</p>
                                <p className="text-xs tabular-nums text-muted-foreground" suppressHydrationWarning>{formatImportedAt(s.importedAt)}</p>
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
