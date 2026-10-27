"use client"

import { useMemo, useState } from 'react'
import { Gauge, Search } from 'lucide-react'
import { Input } from '@/app/components/ui/input'
import { useAdminContextStore } from '@/app/stores/adminContextStore'
import { useOverallBoard } from '@/app/hooks/useOverallBoard'
import { OVERALL_POSITIONS } from '@/server/domains/overall/types'
import type { OverallPosition } from '@/server/domains/overall'
import OverallBoardTable from '@/app/features/overall/OverallBoardTable'
import {
    buildOverallRows,
    matchesOverallFilters,
    OverallSortKey,
    rankOverallRows,
    sortOverallRows,
} from '@/app/features/overall/overallRows'
import { cn } from '@/lib/utils'

type PositionFilter = OverallPosition | 'ALL'
const POSITION_FILTERS: PositionFilter[] = ['ALL', ...OVERALL_POSITIONS]

export default function AdminOverallsPage() {
    const seasonId = useAdminContextStore(s => s.selectedSeasonId)
    const { board, isLoading, error } = useOverallBoard(seasonId)

    const [position, setPosition] = useState<PositionFilter>('ALL')
    const [q, setQ] = useState('')
    const [sort, setSort] = useState<OverallSortKey>('ovr')
    const [desc, setDesc] = useState(true)

    const handleSort = (key: OverallSortKey) => {
        if (key === sort) setDesc(d => !d)
        else {
            setSort(key)
            setDesc(true)
        }
    }

    const ranked = useMemo(() => {
        if (!board) return []
        const rows = buildOverallRows(board.players, board.config.scalings, board.config.overrides)
        const filtered = rows.filter(r => matchesOverallFilters(r, position, ''))
        return rankOverallRows(sortOverallRows(filtered, sort, desc), sort)
            .filter(({ row }) => matchesOverallFilters(row, 'ALL', q))
    }, [board, position, q, sort, desc])

    return (
        <div className="admin-container">
            <div className="admin-section">
                <div className="flex items-center gap-4 pb-6 border-b-2 border-primary/20">
                    <div className="flex items-center justify-center w-14 h-14 rounded-sm bg-primary/10 border border-primary/20">
                        <Gauge className="h-7 w-7 text-primary" />
                    </div>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold uppercase tracking-wider text-foreground">Player Overalls</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Card ratings for the selected season. Attributes are ranked across all regions.
                        </p>
                    </div>
                </div>

                {!seasonId && (
                    <div className="panel p-6 mt-6 text-center">
                        <p className="text-muted-foreground">Select a season to view its overalls.</p>
                    </div>
                )}

                {seasonId && (
                    <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
                        <div className="flex items-center gap-4" role="tablist" aria-label="Filter by position">
                            {POSITION_FILTERS.map(p => (
                                <button
                                    key={p}
                                    type="button"
                                    role="tab"
                                    aria-selected={position === p}
                                    onClick={() => setPosition(p)}
                                    className={cn(
                                        'text-xs font-semibold uppercase tracking-wider transition-colors rounded-sm focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                                        position === p
                                            ? 'text-foreground underline decoration-2 underline-offset-[6px]'
                                            : 'text-muted-foreground hover:text-foreground',
                                    )}
                                >
                                    {p === 'ALL' ? 'All' : p}
                                </button>
                            ))}
                        </div>
                        <div className="relative ml-auto w-full sm:w-64">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
                            <Input
                                value={q}
                                onChange={e => setQ(e.target.value)}
                                placeholder="Search player"
                                aria-label="Search player"
                                className="pl-8 rounded-sm"
                            />
                        </div>
                    </div>
                )}

                {seasonId && error && (
                    <div className="panel p-6 mt-4 text-center">
                        <p className="text-destructive text-sm">{error}</p>
                    </div>
                )}

                {seasonId && isLoading && (
                    <div className="panel mt-4 p-4 space-y-3">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="h-8 bg-muted/40 rounded animate-pulse" />
                        ))}
                    </div>
                )}

                {seasonId && board && board.players.length === 0 && (
                    <div className="panel p-6 mt-4 text-center">
                        <p className="text-muted-foreground">No completed-match stats in this season yet.</p>
                    </div>
                )}

                {seasonId && board && board.players.length > 0 && (
                    <div className="mt-4">
                        {ranked.length === 0 ? (
                            <div className="panel p-6 text-center">
                                <p className="text-muted-foreground text-sm">No players match these filters.</p>
                            </div>
                        ) : (
                            <OverallBoardTable ranked={ranked} sort={sort} desc={desc} onSort={handleSort} />
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
