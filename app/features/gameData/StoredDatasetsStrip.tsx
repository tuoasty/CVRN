"use client"

import type { StoredDatasetSummary } from '@/server/domains/gameData'
import { DATASET_LABELS, GAME_DATASET_KINDS } from '@/server/domains/gameData'

function formatImportedAt(iso: string) {
    return new Date(iso).toLocaleString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
}

export default function StoredDatasetsStrip({ stored }: { stored: StoredDatasetSummary[] }) {
    const byKind = new Map(stored.map(s => [s.kind, s]))

    return (
        <div className="panel grid grid-cols-2 md:grid-cols-4">
            {GAME_DATASET_KINDS.map((kind, i) => {
                const s = byKind.get(kind)
                return (
                    <div key={kind} className={i > 0 ? 'p-4 border-l border-border' : 'p-4'}>
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{DATASET_LABELS[kind]}</p>
                        {s ? (
                            <>
                                <p className="mt-1 font-mono text-lg tabular-nums">{s.count}</p>
                                <p className="text-xs text-muted-foreground tabular-nums" suppressHydrationWarning>{formatImportedAt(s.importedAt)}</p>
                            </>
                        ) : (
                            <p className="mt-1 text-sm text-muted-foreground">Not imported</p>
                        )}
                    </div>
                )
            })}
        </div>
    )
}
