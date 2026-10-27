"use client"

import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/app/components/ui/input'
import { useAdminContextStore } from '@/app/stores/adminContextStore'
import {
    clearOverallOverride,
    copyOverallScalings,
    saveOverallScalings,
    setOverallOverride,
    useOverallBoard,
} from '@/app/hooks/useOverallBoard'
import { useSeasons } from '@/app/hooks/useSeasons'
import { useRegions } from '@/app/hooks/useRegions'
import { REGION_ORDER } from '@/shared/volleyball/regions'
import { OVERALL_POSITIONS, SaveOverallScalingsSchema } from '@/server/domains/overall/types'
import type { OverallPosition, OverallScaling, OverallScalingSet } from '@/server/domains/overall'
import OverallBoardTable from '@/app/features/overall/OverallBoardTable'
import OverallProfileSidebar, { CopySource } from '@/app/features/overall/OverallProfileSidebar'
import ConfirmDialog from '@/app/features/spec/catalog/ConfirmDialog'
import { toast } from '@/app/utils/toast'
import {
    buildOverallRows,
    matchesOverallFilters,
    OverallDisplayRow,
    OverallSortKey,
    rankOverallRows,
    sortOverallRows,
} from '@/app/features/overall/overallRows'
import { cn } from '@/lib/utils'

type PositionFilter = OverallPosition | 'ALL'
const POSITION_FILTERS: PositionFilter[] = ['ALL', ...OVERALL_POSITIONS]

const toList = (set: OverallScalingSet): OverallScaling[] => OVERALL_POSITIONS.map(p => set[p])

const regionRank = (code: string) => {
    const i = (REGION_ORDER as readonly string[]).indexOf(code)
    return i === -1 ? REGION_ORDER.length : i
}

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
    const { regions } = useRegions()

    const [position, setPosition] = useState<PositionFilter>('ALL')
    const [q, setQ] = useState('')
    const [sort, setSort] = useState<OverallSortKey>('ovr')
    const [desc, setDesc] = useState(true)

    const [draft, setDraft] = useState<OverallScalingSet | null>(null)
    const [saving, setSaving] = useState(false)
    const [copying, setCopying] = useState(false)
    const [copyTarget, setCopyTarget] = useState<CopySource | null>(null)

    useEffect(() => {
        setDraft(null)
    }, [seasonId])

    const regionCodeById = useMemo(() => new Map(regions.map(r => [r.id, r.code])), [regions])
    const season = seasons.find(s => s.id === seasonId) ?? null
    const seasonLabel = season ? `${regionCodeById.get(season.region_id) ?? ''} · ${season.name}` : null

    const handleSort = (key: OverallSortKey) => {
        if (key === sort) setDesc(d => !d)
        else {
            setSort(key)
            setDesc(true)
        }
    }

    const savedScalings = board?.config.scalings ?? null
    const scalings = draft ?? savedScalings
    const dirtyPositions = useMemo(
        () => (draft && savedScalings
            ? OVERALL_POSITIONS.filter(p => JSON.stringify(draft[p]) !== JSON.stringify(savedScalings[p]))
            : []),
        [draft, savedScalings],
    )
    const errors = useMemo(() => (seasonId && scalings ? validationErrors(seasonId, scalings) : []), [seasonId, scalings])

    const copySources = useMemo<CopySource[]>(() => seasons
        .filter(s => s.id !== seasonId)
        .map(s => ({ id: s.id, name: s.name, regionCode: regionCodeById.get(s.region_id) ?? '?', startDate: s.start_date }))
        .sort((a, b) => regionRank(a.regionCode) - regionRank(b.regionCode) || b.startDate.localeCompare(a.startDate))
        .map(({ id, name, regionCode }) => ({ id, name, regionCode })),
    [seasons, regionCodeById, seasonId])

    const positionCounts = useMemo(() => {
        const counts: Record<PositionFilter, number> = { ALL: 0, OUT: 0, OPP: 0, MID: 0, SET: 0, LIB: 0 }
        for (const p of board?.players ?? []) {
            counts.ALL += 1
            if (p.position) counts[p.position] += 1
        }
        return counts
    }, [board])

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
                toast.error('Failed to save profiles', result.error.message)
                return
            }
            setDraft(null)
            toast.success('Profiles saved')
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
                toast.error('Failed to copy profiles', result.error.message)
                return
            }
            setDraft(null)
            toast.success(`Copied profiles from ${copyTarget.regionCode} ${copyTarget.name}`)
            setCopyTarget(null)
        } finally {
            setCopying(false)
        }
    }

    const handleOverride = async (row: OverallDisplayRow, overall: number) => {
        if (!seasonId) return
        const result = await setOverallOverride(seasonId, row.playerId, overall)
        if (!result.ok) toast.error(`Failed to override ${row.username}`, result.error.message)
    }

    const handleClearOverride = async (row: OverallDisplayRow) => {
        if (!seasonId) return
        const result = await clearOverallOverride(seasonId, row.playerId)
        if (!result.ok) toast.error(`Failed to revert ${row.username}`, result.error.message)
    }

    const ranked = useMemo(() => {
        if (!board || !scalings) return []
        const rows = buildOverallRows(board.players, scalings, board.config.overrides)
        const filtered = rows.filter(r => matchesOverallFilters(r, position, ''))
        return rankOverallRows(sortOverallRows(filtered, sort, desc), sort)
            .filter(({ row }) => matchesOverallFilters(row, 'ALL', q))
    }, [board, scalings, position, q, sort, desc])

    return (
        <div className="page-wide py-6">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h1 className="text-xl font-semibold tracking-tight text-foreground">Player Overalls</h1>
                <span className="text-sm text-muted-foreground">
                    {seasonLabel ? `${seasonLabel} · ` : ''}ranks pooled across all regions
                </span>
            </div>

            {!seasonId && (
                <p className="mt-8 text-sm text-muted-foreground">Select a season in the navbar to view its overalls.</p>
            )}

            {seasonId && (
                <div className="mt-4 flex flex-wrap items-end gap-x-5 gap-y-2 border-b border-border">
                    <div className="flex items-end gap-5" role="tablist" aria-label="Position">
                        {POSITION_FILTERS.map(p => {
                            const selected = position === p
                            const dirty = p !== 'ALL' && dirtyPositions.includes(p)
                            return (
                                <button
                                    key={p}
                                    type="button"
                                    role="tab"
                                    aria-selected={selected}
                                    onClick={() => setPosition(p)}
                                    className={cn(
                                        'pb-2 text-sm font-semibold transition-colors duration-150 rounded-sm focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                                        selected
                                            ? 'text-foreground shadow-[inset_0_-2px_0_currentColor]'
                                            : 'text-muted-foreground hover:text-foreground',
                                    )}
                                >
                                    {p === 'ALL' ? 'All' : p}
                                    {board && <span className="ml-1 text-xs font-normal tabular-nums text-muted-foreground">{positionCounts[p]}</span>}
                                    {dirty && <span className="ml-0.5 text-foreground" aria-label="unsaved changes">•</span>}
                                </button>
                            )
                        })}
                    </div>
                    <div className="relative mb-1.5 ml-auto w-full sm:w-56">
                        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
                        <Input
                            value={q}
                            onChange={e => setQ(e.target.value)}
                            placeholder="Search player"
                            aria-label="Search player"
                            className="h-8 rounded-sm pl-8 text-sm"
                        />
                    </div>
                </div>
            )}

            {seasonId && error && <p className="mt-6 text-sm text-destructive">{error}</p>}

            {seasonId && isLoading && (
                <div className="mt-4 space-y-2" aria-busy="true">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="h-7 animate-pulse bg-muted/40" />
                    ))}
                </div>
            )}

            {seasonId && board && scalings && (
                <div className="mt-4 flex flex-col gap-8 lg:flex-row lg:items-start">
                    <OverallProfileSidebar
                        mode={position}
                        scalings={scalings}
                        savedPositions={board.config.savedPositions}
                        dirtyPositions={dirtyPositions}
                        errors={errors}
                        saving={saving}
                        copying={copying}
                        copySources={copySources}
                        onChange={handleScalingChange}
                        onSelectPosition={setPosition}
                        onSave={handleSave}
                        onDiscard={() => setDraft(null)}
                        onCopy={setCopyTarget}
                    />

                    {board.players.length === 0 ? (
                        <p className="flex-1 py-8 text-sm text-muted-foreground">No completed-match stats in this season yet.</p>
                    ) : ranked.length === 0 ? (
                        <p className="flex-1 py-8 text-sm text-muted-foreground">No players match these filters.</p>
                    ) : (
                        <OverallBoardTable
                            ranked={ranked}
                            sort={sort}
                            desc={desc}
                            showPosition={position === 'ALL'}
                            onSort={handleSort}
                            onOverride={handleOverride}
                            onClearOverride={handleClearOverride}
                        />
                    )}
                </div>
            )}

            <ConfirmDialog
                open={!!copyTarget}
                title="Copy profiles"
                description={<>Replace this season&apos;s saved profiles with the ones from <strong>{copyTarget?.regionCode} {copyTarget?.name}</strong>? Unsaved edits are discarded.</>}
                cancelLabel="Cancel"
                confirmLabel={copying ? 'Copying...' : 'Copy'}
                busy={copying}
                onCancel={() => setCopyTarget(null)}
                onConfirm={handleCopy}
            />
        </div>
    )
}
