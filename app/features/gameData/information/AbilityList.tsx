"use client"

import { useEffect, useRef, type KeyboardEvent, type RefObject } from 'react'
import { cn } from '@/lib/utils'
import { rarityDotClass } from './abilityLinks'

export interface ListGroup {
    label: string | null
    items: { key: string; rarity?: string; attention: boolean }[]
}

interface AbilityListProps {
    groups: ListGroup[]
    selected: string | null
    filter: string
    filterRef: RefObject<HTMLInputElement | null>
    onFilter: (value: string) => void
    onSelect: (key: string) => void
    onMove: (delta: 1 | -1) => void
}

export default function AbilityList({ groups, selected, filter, filterRef, onFilter, onSelect, onMove }: AbilityListProps) {
    const listRef = useRef<HTMLDivElement>(null)
    const total = groups.reduce((n, g) => n + g.items.length, 0)

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
                    placeholder="Filter abilities"
                    aria-label="Filter abilities"
                    className="min-w-0 flex-1 bg-transparent py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none"
                />
                <span aria-hidden className="font-mono text-xs text-muted-foreground">J K /</span>
            </div>
            <div ref={listRef} role="listbox" aria-label="Abilities" onKeyDown={onKeyDown} className="flex flex-col">
                {total === 0 && <p className="px-2.5 py-3 text-sm text-muted-foreground">No ability matches &ldquo;{filter}&rdquo;.</p>}
                {groups.map(group => group.items.length > 0 && (
                    <div key={group.label ?? 'all'} role="group" aria-label={group.label ?? undefined} className="flex flex-col">
                        {group.label && (
                            <div className="px-2.5 pb-1 pt-3 text-xs font-semibold text-muted-foreground">
                                {group.label} <span className="font-mono font-normal tabular-nums">{group.items.length}</span>
                            </div>
                        )}
                        {group.items.map(item => {
                            const isSelected = item.key === selected
                            return (
                                <div
                                    key={item.key}
                                    data-key={item.key}
                                    role="option"
                                    aria-selected={isSelected}
                                    tabIndex={isSelected ? 0 : -1}
                                    onClick={() => onSelect(item.key)}
                                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(item.key) } }}
                                    className={cn(
                                        'flex cursor-pointer items-center gap-2 rounded-sm px-2.5 py-1.5 text-sm transition-colors duration-150 motion-reduce:transition-none',
                                        'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                                        isSelected ? 'bg-muted font-semibold text-foreground' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                                    )}
                                >
                                    <span aria-hidden className={cn('h-2 w-2 shrink-0 rounded-full', rarityDotClass(item.rarity))} />
                                    <span className="min-w-0 truncate">{item.key}</span>
                                    {item.attention && (
                                        <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-secondary">
                                            <span className="sr-only">needs attention</span>
                                        </span>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                ))}
            </div>
        </div>
    )
}
