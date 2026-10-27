"use client"

import { Suspense, useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/app/components/ui/input'
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
import OverallProfileSidebar from '@/app/features/overall/OverallProfileSidebar'
import ConfirmDialog from '@/app/features/spec/catalog/ConfirmDialog'
import { REGION_ALL, useOverallParams } from '@/app/features/overall/useOverallParams'
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

const TAB = 'pb-2 text-sm font-semibold transition-colors duration-150 rounded-sm focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50'
const TAB_ON = 'text-foreground shadow-[inset_0_-2px_0_currentColor]'
const TAB_OFF = 'text-muted-foreground hover:text-foreground'

function ScopeTabs<T extends string | number>({ label, options, value, onSelect }: {
    label: string
    options: { value: T; label: string }[]
    value: T | null
    onSelect: (value: T) => void
}) {
    return (
        <div className="flex items-end gap-4" role="tablist" aria-label={label}>
            <span className="pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
            {options.map(o => (
                <button
                    key={o.value}
                    type="button"
                    role="tab"
                    aria-selected={o.value === value}
                    onClick={() => onSelect(o.value)}
                    className={cn(TAB, o.value === value ? TAB_ON : TAB_OFF)}
                >
                    {o.label}
                </button>
            ))}
        </div>
    )
}

function validationErrors(seasonNumber: number, set: OverallScalingSet): string[] {
    const parsed = SaveOverallScalingsSchema.safeParse({ seasonNumber, scalings: toList(set) })
    if (parsed.success) return []
    return [...new Set(parsed.error.issues.map(issue => {
        const index = issue.path[1]
        const position = typeof index === 'number' ? OVERALL_POSITIONS[index] : null
        return position ? `${position}: ${issue.message}` : issue.message
    }))]
}

export default function AdminOverallsPage() {
    return (
        <Suspense>
            <AdminOverallsContent />
        </Suspense>
    )
}

function AdminOverallsContent() {
    const { seasons } = useSeasons()
    const { regions } = useRegions()

    const seasonNumbers = useMemo(() => [...new Set(seasons.map(s => s.season_number))].sort((a, b) => a - b), [seasons])
    const regionCodes = useMemo(() => regions.map(r => r.code).sort((a, b) => regionRank(a) - regionRank(b)), [regions])
    const { seasonNumber, region, setSeason, setRegion } = useOverallParams(seasonNumbers, regionCodes)
    const { board, isLoading, error } = useOverallBoard(seasonNumber)

    const [position, setPosition] = useState<PositionFilter>('ALL')
    const [q, setQ] = useState('')
    const [sort, setSort] = useState<OverallSortKey>('ovr')
    const [desc, setDesc] = useState(true)

    const [draft, setDraft] = useState<OverallScalingSet | null>(null)
    const [saving, setSaving] = useState(false)
    const [copying, setCopying] = useState(false)
    const [copyTarget, setCopyTarget] = useState<number | null>(null)

    useEffect(() => {
        setDraft(null)
    }, [seasonNumber])

    const inRegion = (code: string | null) => region === REGION_ALL || code?.toLowerCase() === region

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
    const errors = useMemo(() => (seasonNumber && scalings ? validationErrors(seasonNumber, scalings) : []), [seasonNumber, scalings])

    const copySources = useMemo(
        () => seasonNumbers.filter(n => n !== seasonNumber).sort((a, b) => b - a),
        [seasonNumbers, seasonNumber],
    )

    const positionCounts = useMemo(() => {
        const counts: Record<PositionFilter, number> = { ALL: 0, OUT: 0, OPP: 0, MID: 0, SET: 0, LIB: 0 }
        for (const p of board?.players ?? []) {
            if (region !== REGION_ALL && p.regionCode?.toLowerCase() !== region) continue
            counts.ALL += 1
            if (p.position) counts[p.position] += 1
        }
        return counts
    }, [board, region])

    const handleScalingChange = (scaling: OverallScaling) => {
        if (!savedScalings) return
        setDraft(prev => ({ ...(prev ?? savedScalings), [scaling.position]: scaling }))
    }

    const handleSave = async () => {
        if (!seasonNumber || !scalings) return
        setSaving(true)
        try {
            const result = await saveOverallScalings(seasonNumber, toList(scalings))
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
        if (!seasonNumber || copyTarget === null) return
        setCopying(true)
        try {
            const result = await copyOverallScalings(seasonNumber, copyTarget)
            if (!result.ok) {
                toast.error('Failed to copy profiles', result.error.message)
                return
            }
            setDraft(null)
            toast.success(`Copied profiles from Season ${copyTarget}`)
            setCopyTarget(null)
        } finally {
            setCopying(false)
        }
    }

    const handleOverride = async (row: OverallDisplayRow, overall: number) => {
        if (!seasonNumber) return
        const result = await setOverallOverride(seasonNumber, row.playerId, overall)
        if (!result.ok) toast.error(`Failed to override ${row.username}`, result.error.message)
    }

    const handleClearOverride = async (row: OverallDisplayRow) => {
        if (!seasonNumber) return
        const result = await clearOverallOverride(seasonNumber, row.playerId)
        if (!result.ok) toast.error(`Failed to revert ${row.username}`, result.error.message)
    }

    const ranked = useMemo(() => {
        if (!board || !scalings) return []
        const rows = buildOverallRows(board.players, scalings, board.config.overrides)
        const filtered = rows.filter(r => inRegion(r.regionCode) && matchesOverallFilters(r, position, ''))
        return rankOverallRows(sortOverallRows(filtered, sort, desc), sort)
            .filter(({ row }) => matchesOverallFilters(row, 'ALL', q))
    }, [board, scalings, region, position, q, sort, desc])

    return (
        <div className="page-wide py-6">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h1 className="text-xl font-semibold tracking-tight text-foreground">Player Overalls</h1>
                <span className="text-sm text-muted-foreground">
                    {seasonNumber ? `Season ${seasonNumber} · ` : ''}profiles and ranks shared by all regions
                </span>
            </div>

            <div className="mt-3 flex flex-wrap items-end gap-x-8 gap-y-2">
                <ScopeTabs
                    label="Season"
                    options={seasonNumbers.map(n => ({ value: n, label: `S${n}` }))}
                    value={seasonNumber}
                    onSelect={setSeason}
                />
                <ScopeTabs
                    label="Region"
                    options={[
                        { value: REGION_ALL, label: 'All' },
                        ...regionCodes.map(c => ({ value: c.toLowerCase(), label: c })),
                    ]}
                    value={region}
                    onSelect={setRegion}
                />
            </div>

            {seasonNumber && (
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

            {seasonNumber && error &&<p className="mt-6 text-sm text-destructive">{error}</p>}

            {seasonNumber && isLoading && (
                <div className="mt-4 space-y-2" aria-busy="true">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="h-7 animate-pulse bg-muted/40" />
                    ))}
                </div>
            )}

            {seasonNumber && board && scalings && (
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
                open={copyTarget !== null}
                title="Copy profiles"
                description={<>Replace Season {seasonNumber}&apos;s saved profiles with the ones from <strong>Season {copyTarget}</strong>? Unsaved edits are discarded.</>}
                cancelLabel="Cancel"
                confirmLabel={copying ? 'Copying...' : 'Copy'}
                busy={copying}
                onCancel={() => setCopyTarget(null)}
                onConfirm={handleCopy}
            />
        </div>
    )
}
