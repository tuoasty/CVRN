"use client"

import { useEffect, useRef, type KeyboardEvent, type RefObject } from 'react'
import { ChevronRight } from 'lucide-react'
import type { LoadoutGroup, LoadoutRow } from '@/server/domains/gameData/helpers/specLoadouts/loadoutView'
import { cn } from '@/lib/utils'

interface SpecLoadoutListProps {
    groups: LoadoutGroup[]
    selected: string | null
    filter: string
    filterRef: RefObject<HTMLInputElement | null>
    onFilter: (value: string) => void
    showVaulted: (label: string) => boolean
    onToggleVaulted: (label: string) => void
    onSelect: (key: string) => void
    onMove: (delta: 1 | -1) => void
}

export default function SpecLoadoutList({ groups, selected, filter, filterRef, onFilter, showVaulted, onToggleVaulted, onSelect, onMove }: SpecLoadoutListProps) {
    const listRef = useRef<HTMLDivElement>(null)
    const total = groups.reduce((n, g) => n + g.rows.length, 0)

    useEffect(() => {
        if (!selected) return
        listRef.current?.querySelector<HTMLElement>(`[data-key="${CSS.escape(selected)}"]`)?.scrollIntoView({ block: 'nearest' })
    }, [selected])

    function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
        if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
        event.preventDefault()
        onMove(event.key === 'ArrowDown' ? 1 : -1)
        requestAnimationFrame(() => listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus())
    }

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 border-b border-border">
                <input
                    ref={filterRef}
                    value={filter}
                    onChange={e => onFilter(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Escape') { onFilter(''); e.currentTarget.blur() } }}
                    placeholder="Filter specs"
                    aria-label="Filter specs"
                    className="min-w-0 flex-1 bg-transparent py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none"
                />
                <span aria-hidden className="font-mono text-xs text-muted-foreground">J K /</span>
            </div>
            <div ref={listRef} role="listbox" aria-label="Spec loadouts" onKeyDown={onKeyDown} className="flex flex-col">
                {total === 0 && <p className="px-2.5 py-3 text-sm text-muted-foreground">No spec matches &ldquo;{filter}&rdquo;.</p>}
                {groups.map(group => {
                    const active = group.rows.filter(r => !r.vaulted)
                    const vaulted = group.rows.filter(r => r.vaulted)
                    const open = showVaulted(group.label)
                    return (
                        <div key={group.label} role="group" aria-label={group.label} className="mt-6 flex flex-col first:mt-2">
                            <div className="mb-1.5 flex items-baseline gap-2 border-b border-border px-2.5 pb-1.5 text-sm font-semibold text-foreground">
                                {group.label}
                                <span className="font-mono text-xs font-normal tabular-nums text-muted-foreground">{group.rows.length}</span>
                            </div>
                            {active.map(row => <Row key={row.gameKey} row={row} selected={row.gameKey === selected} onSelect={onSelect} />)}
                            {vaulted.length > 0 && (
                                <button
                                    type="button"
                                    aria-expanded={open}
                                    onClick={() => onToggleVaulted(group.label)}
                                    className="mt-1 flex items-center gap-1 rounded-sm px-2.5 py-1 text-xs text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 motion-reduce:transition-none"
                                >
                                    <ChevronRight aria-hidden className={cn('h-3.5 w-3.5 transition-transform duration-150 motion-reduce:transition-none', open && 'rotate-90')} />
                                    <span className="font-mono tabular-nums">{vaulted.length}</span> vaulted
                                </button>
                            )}
                            {open && vaulted.map(row => <Row key={row.gameKey} row={row} selected={row.gameKey === selected} onSelect={onSelect} />)}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

function Row({ row, selected, onSelect }: { row: LoadoutRow; selected: boolean; onSelect: (key: string) => void }) {
    return (
        <div
            data-key={row.gameKey}
            role="option"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onSelect(row.gameKey)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(row.gameKey) } }}
            className={cn(
                'grid cursor-pointer grid-cols-[1fr_28px_8px] items-center gap-x-1.5 rounded-sm px-2.5 py-1.5 text-sm transition-colors duration-150 motion-reduce:transition-none',
                'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                selected
                    ? cn('bg-muted font-semibold', row.vaulted ? 'text-foreground/60' : 'text-foreground')
                    : cn(row.state === 'skipped' || row.vaulted ? 'text-muted-foreground/60' : 'text-muted-foreground', 'hover:bg-muted/50 hover:text-foreground'),
            )}
        >
            <span className="min-w-0 truncate">{row.label}</span>
            <span className="text-right font-mono text-xs font-normal tabular-nums">{row.stars !== null && `${row.stars}★`}</span>
            {row.state === 'unlinked'
                ? <span className="h-1.5 w-1.5 rounded-full bg-secondary"><span className="sr-only">not linked</span></span>
                : <span />}
        </div>
    )
}
