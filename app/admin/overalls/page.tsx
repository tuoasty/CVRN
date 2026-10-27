"use client"

import { useEffect, useMemo, useState } from 'react'
import { Gauge, Search, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { useAdminContextStore } from '@/app/stores/adminContextStore'
import { copyOverallScalings, saveOverallScalings, useOverallBoard } from '@/app/hooks/useOverallBoard'
import { useSeasons } from '@/app/hooks/useSeasons'
import { OVERALL_POSITIONS, SaveOverallScalingsSchema } from '@/server/domains/overall/types'
import type { OverallPosition, OverallScaling, OverallScalingSet } from '@/server/domains/overall'
import OverallBoardTable from '@/app/features/overall/OverallBoardTable'
import OverallScalingsTray from '@/app/features/overall/OverallScalingsTray'
import ConfirmDialog from '@/app/features/spec/catalog/ConfirmDialog'
import { toast } from '@/app/utils/toast'
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

type CopySource = { id: string; name: string }

const toList = (set: OverallScalingSet): OverallScaling[] => OVERALL_POSITIONS.map(p => set[p])

function validationErrors(seasonId: string, set: OverallScalingSet): string[] {
    const parsed = SaveOverallScalingsSchema.safeParse({ seasonId, scalings: toList(set) })
    if (parsed.success) return []
    return [...new Set(parsed.error.issues.map(issue => {
        const index = issue.path[1]
        const position = typeof index === 'number' ? OVERALL_POSITIONS[index] : null
        return position ? `${position}: ${issue.message}` : issue.message
    }))]
}

export default function AdminOverallsPage() {
    const seasonId = useAdminContextStore(s => s.selectedSeasonId)
    const { board, isLoading, error } = useOverallBoard(seasonId)
    const { seasons } = useSeasons()

    const [position, setPosition] = useState<PositionFilter>('ALL')
    const [q, setQ] = useState('')
    const [sort, setSort] = useState<OverallSortKey>('ovr')
    const [desc, setDesc] = useState(true)

    const [trayOpen, setTrayOpen] = useState(false)
    const [draft, setDraft] = useState<OverallScalingSet | null>(null)
    const [saving, setSaving] = useState(false)
    const [copying, setCopying] = useState(false)
    const [copyTarget, setCopyTarget] = useState<CopySource | null>(null)

    useEffect(() => {
        setDraft(null)
    }, [seasonId])

    const handleSort = (key: OverallSortKey) => {
        if (key === sort) setDesc(d => !d)
        else {
            setSort(key)
            setDesc(true)
        }
    }

    const savedScalings = board?.config.scalings ?? null
    const scalings = draft ?? savedScalings
    const dirty = !!draft && !!savedScalings && JSON.stringify(toList(draft)) !== JSON.stringify(toList(savedScalings))
    const errors = useMemo(() => (seasonId && scalings ? validationErrors(seasonId, scalings) : []), [seasonId, scalings])

    const copySources = useMemo<CopySource[]>(() => {
        const current = seasons.find(s => s.id === seasonId)
        if (!current) return []
        return seasons
            .filter(s => s.region_id === current.region_id && s.id !== current.id && s.start_date < current.start_date)
            .sort((a, b) => b.start_date.localeCompare(a.start_date))
            .map(s => ({ id: s.id, name: s.name }))
    }, [seasons, seasonId])

    const handleScalingChange = (scaling: OverallScaling) => {
        if (!savedScalings) return
        setDraft(prev => ({ ...(prev ?? savedScalings), [scaling.position]: scaling }))
    }

    const handleSave = async () => {
        if (!seasonId || !scalings) return
        setSaving(true)
        try {
            const result = await saveOverallScalings(seasonId, toList(scalings))
            if (!result.ok) {
                toast.error('Failed to save scalings', result.error.message)
                return
            }
            setDraft(null)
            toast.success('Scalings saved')
        } finally {
            setSaving(false)
        }
    }

    const handleCopy = async () => {
        if (!seasonId || !copyTarget) return
        setCopying(true)
        try {
            const result = await copyOverallScalings(seasonId, copyTarget.id)
            if (!result.ok) {
                toast.error('Failed to copy scalings', result.error.message)
                return
            }
            setDraft(null)
            toast.success(`Copied scalings from ${copyTarget.name}`)
            setCopyTarget(null)
        } finally {
            setCopying(false)
        }
    }

    const ranked = useMemo(() => {
        if (!board || !scalings) return []
        const rows = buildOverallRows(board.players, scalings, board.config.overrides)
        const filtered = rows.filter(r => matchesOverallFilters(r, position, ''))
        return rankOverallRows(sortOverallRows(filtered, sort, desc), sort)
            .filter(({ row }) => matchesOverallFilters(row, 'ALL', q))
    }, [board, scalings, position, q, sort, desc])

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
                    {seasonId && board && (
                        <Button
                            variant={trayOpen ? 'secondary' : 'outline'}
                            className="rounded-sm gap-2 shrink-0"
                            aria-expanded={trayOpen}
                            onClick={() => setTrayOpen(o => !o)}
                        >
                            <SlidersHorizontal className="h-4 w-4" />
                            Scalings
                            {dirty && <span className="h-1.5 w-1.5 rounded-full bg-foreground" aria-label="Unsaved changes" />}
                        </Button>
                    )}
                </div>

                {seasonId && board && scalings && trayOpen && (
                    <div className="mt-6">
                        <OverallScalingsTray
                            scalings={scalings}
                            savedPositions={board.config.savedPositions}
                            dirty={dirty}
                            errors={errors}
                            saving={saving}
                            copying={copying}
                            copySources={copySources}
                            onChange={handleScalingChange}
                            onSave={handleSave}
                            onDiscard={() => setDraft(null)}
                            onCopy={setCopyTarget}
                        />
                    </div>
                )}

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

            <ConfirmDialog
                open={!!copyTarget}
                title="Copy scalings"
                description={<>Replace this season&apos;s saved scalings with the ones from <strong>{copyTarget?.name}</strong>? Unsaved edits are discarded.</>}
                cancelLabel="Cancel"
                confirmLabel={copying ? 'Copying...' : 'Copy'}
                busy={copying}
                onCancel={() => setCopyTarget(null)}
                onConfirm={handleCopy}
            />
        </div>
    )
}
