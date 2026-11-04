"use client"

import { Suspense, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Search } from 'lucide-react'
import { Input } from '@/app/components/ui/input'
import { useSeasons } from '@/app/hooks/useSeasons'
import { useRegions } from '@/app/hooks/useRegions'
import { useOverallBoard } from '@/app/hooks/useOverallBoard'
import { useCardCatalog } from '@/app/hooks/usePlayerCard'
import { REGION_ORDER } from '@/shared/volleyball/regions'
import { REGION_ALL, useOverallParams } from '@/app/features/overall/useOverallParams'
import { buildOverallRows, matchesOverallFilters, sortOverallRows } from '@/app/features/overall/overallRows'
import { LINK } from '@/app/features/playerCard/cardFormStyles'
import PlayerCardWorkbench, { type LayoutDrafts } from '@/app/features/playerCard/PlayerCardWorkbench'
import CustomCardWorkbench from '@/app/features/playerCard/CustomCardWorkbench'
import CustomPlayerPicker, { type CustomPlayerChoice } from '@/app/features/playerCard/CustomPlayerPicker'
import CardBulkStatus from '@/app/features/playerCard/CardBulkStatus'
import CardBulkControls from '@/app/features/playerCard/CardBulkControls'
import { pickTierTemplate } from '@/server/domains/playerCard/helpers/toCardShapes'
import { cn } from '@/lib/utils'

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
        <div className="flex flex-wrap items-end gap-x-4" role="tablist" aria-label={label}>
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

export default function AdminCardsPage() {
    return (
        <Suspense>
            <AdminCardsContent />
        </Suspense>
    )
}

function AdminCardsContent() {
    const { seasons } = useSeasons()
    const { regions } = useRegions()
    const seasonNumbers = useMemo(() => [...new Set(seasons.map(s => s.season_number))].sort((a, b) => a - b), [seasons])
    const regionCodes = useMemo(() => regions.map(r => r.code).sort((a, b) => regionRank(a) - regionRank(b)), [regions])
    const { seasonNumber, region, setSeason, setRegion } = useOverallParams(seasonNumbers, regionCodes)

    const { board, isLoading: boardLoading, error: boardError } = useOverallBoard(seasonNumber)
    const { groups, isLoading: catalogLoading, error: catalogError } = useCardCatalog()

    const searchParams = useSearchParams()
    const [groupId, setGroupId] = useState<string | null>(() => searchParams.get('group'))
    const [playerId, setPlayerId] = useState<string | null>(null)
    const [q, setQ] = useState('')
    const [drafts, setDrafts] = useState<LayoutDrafts>({})
    const [source, setSource] = useState<'board' | 'custom'>('board')
    const [customPlayer, setCustomPlayer] = useState<CustomPlayerChoice | null>(null)

    const group = groups.find(g => g.id === groupId)
        ?? groups.find(g => g.isActive && g.templates.length > 0)
        ?? groups[0]
        ?? null

    const rows = useMemo(() => {
        if (!board) return []
        const all = buildOverallRows(board.players, board.config.scalings, board.config.overrides)
            .filter(r => region === REGION_ALL || r.regionCode?.toLowerCase() === region)
        return sortOverallRows(all, 'ovr', true)
    }, [board, region])
    const visibleRows = useMemo(() => rows.filter(r => matchesOverallFilters(r, 'ALL', q)), [rows, q])
    const selected = rows.find(r => r.playerId === playerId) ?? null
    const emptyNote = boardLoading ? 'Loading players...' : 'No player on this board to preview with'
    const groupDraft = group ? drafts[group.id] : undefined
    const layoutDirty = groupDraft !== undefined && JSON.stringify(groupDraft) !== JSON.stringify(group?.layers ?? [])

    return (
        <div className="page-wide py-6">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h1 className="text-xl font-semibold tracking-tight text-foreground">Player Cards</h1>
                <span className="text-sm text-muted-foreground">Layout and generation</span>
                <Link href="/admin/cards/groups" className={LINK}>Manage groups and tiers</Link>
            </div>

            <CardBulkStatus />

            <section className="mt-6">
                <div className="flex flex-wrap items-end gap-x-8 gap-y-2">
                    <ScopeTabs
                        label="Season"
                        options={seasonNumbers.map(n => ({ value: n, label: `S${n}` }))}
                        value={seasonNumber}
                        onSelect={n => { setSeason(n); setPlayerId(null) }}
                    />
                    <ScopeTabs
                        label="Region"
                        options={[{ value: REGION_ALL, label: 'All' }, ...regionCodes.map(c => ({ value: c.toLowerCase(), label: c }))]}
                        value={region}
                        onSelect={setRegion}
                    />
                    {groups.length > 0 && (
                        <ScopeTabs
                            label="Group"
                            options={groups.map(g => ({ value: g.id, label: g.isActive ? g.name : `${g.name} (inactive)` }))}
                            value={group?.id ?? null}
                            onSelect={setGroupId}
                        />
                    )}
                    <ScopeTabs
                        label="Player"
                        options={[{ value: 'board' as const, label: 'From board' }, { value: 'custom' as const, label: 'Custom' }]}
                        value={source}
                        onSelect={setSource}
                    />
                </div>

                <CardBulkControls
                    seasonNumber={seasonNumber}
                    region={region === REGION_ALL ? null : region}
                    group={group}
                    rows={rows}
                    dirty={layoutDirty}
                />

                {catalogError ? (
                    <p className="mt-4 text-sm text-destructive">{catalogError}</p>
                ) : !catalogLoading && groups.length === 0 ? (
                    <p className="mt-4 text-sm text-muted-foreground">
                        No card groups yet. <Link href="/admin/cards/groups" className={LINK}>Manage groups and tiers</Link>
                    </p>
                ) : (
                    <div className="mt-4 flex flex-col gap-8 lg:flex-row lg:items-start">
                        {source === 'custom' ? (
                            <div className="w-full shrink-0 lg:w-[20rem]">
                                <CustomPlayerPicker selected={customPlayer} onSelect={setCustomPlayer} />
                            </div>
                        ) : (
                        <div className="flex w-full shrink-0 flex-col lg:w-[20rem]">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
                                <Input
                                    value={q}
                                    onChange={e => setQ(e.target.value)}
                                    placeholder="Search player"
                                    aria-label="Search player"
                                    className="h-8 rounded-sm pl-8 text-sm"
                                />
                            </div>
                            {boardError ? (
                                <p className="py-6 text-sm text-destructive">{boardError}</p>
                            ) : boardLoading ? (
                                <div className="mt-2 space-y-1" aria-busy="true">
                                    {[...Array(8)].map((_, i) => <div key={i} className="h-8 animate-pulse bg-muted/40" />)}
                                </div>
                            ) : visibleRows.length === 0 ? (
                                <p className="py-6 text-sm text-muted-foreground">No players match.</p>
                            ) : (
                                <ul className="mt-2 max-h-[34rem] overflow-y-auto border-y border-border" role="listbox" aria-label="Players">
                                    {visibleRows.map(row => {
                                        const isSelected = row.playerId === playerId
                                        const tier = group ? pickTierTemplate(group.templates, row.ovr)?.rank : undefined
                                        return (
                                            <li key={row.playerId} role="option" aria-selected={isSelected}>
                                                <button
                                                    type="button"
                                                    onClick={() => setPlayerId(row.playerId)}
                                                    className={cn(
                                                        'grid h-9 w-full grid-cols-[1fr_auto_2.5rem_2.5rem] items-center gap-3 px-2 text-left text-sm transition-colors focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                                                        isSelected
                                                            ? 'font-semibold text-foreground shadow-[inset_2px_0_0_currentColor]'
                                                            : 'text-foreground hover:bg-muted/40',
                                                    )}
                                                >
                                                    <span className="truncate">{row.username}</span>
                                                    <span className="truncate text-xs font-normal text-muted-foreground">{row.position ?? ''}</span>
                                                    <span className="text-right font-mono tabular-nums">{row.ovr}</span>
                                                    <span className="text-right font-mono text-xs tabular-nums text-muted-foreground">{tier ? `T${tier}` : ''}</span>
                                                </button>
                                            </li>
                                        )
                                    })}
                                </ul>
                            )}
                        </div>
                        )}

                        <div className="min-w-0 flex-1">
                            {!group || !seasonNumber ? null : source === 'custom' && customPlayer ? (
                                <CustomCardWorkbench
                                    key={customPlayer.robloxUserId}
                                    player={customPlayer}
                                    seasonNumber={seasonNumber}
                                    regionCode={region === REGION_ALL ? null : region.toUpperCase()}
                                    group={group}
                                    groups={groups}
                                    drafts={drafts}
                                    onDraftsChange={setDrafts}
                                    onGenerated={card => setCustomPlayer(current => current && { ...current, playerId: card.playerId })}
                                    onRegistered={playerId => setCustomPlayer(current => current && { ...current, playerId })}
                                />
                            ) : (
                                <PlayerCardWorkbench
                                    key={source === 'board' && selected ? selected.playerId : 'sample'}
                                    player={source === 'board' && selected ? selected : rows[0] ?? null}
                                    sampleNote={
                                        source === 'custom'
                                            ? 'Pick a player to make a custom card'
                                            : selected ? null : 'Pick a player to generate their card'
                                    }
                                    emptyNote={emptyNote}
                                    seasonNumber={seasonNumber}
                                    group={group}
                                    groups={groups}
                                    drafts={drafts}
                                    onDraftsChange={setDrafts}
                                />
                            )}
                        </div>
                    </div>
                )}
            </section>
        </div>
    )
}
