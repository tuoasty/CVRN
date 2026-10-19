"use client"

import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { formatHeight } from '@/shared/utils/height'
import type { InspectorData, PickOption, PublicBuildCatalog } from '@/server/domains/gameData'
import RarityHeading from '../RarityHeading'
import SearchBox from '../SearchBox'
import { rarityTextClass } from '../rarity'
import { useInfoParams } from '../useInfoParams'
import Collapse from '../Collapse'
import BuildRow, { BUILD_GRID } from './BuildRow'
import BuildSlot from './BuildSlot'
import PickTray, { trayItemId, type TrayColumn } from './PickTray'
import { filterBuilds, parseBuildFilters } from './filterBuilds'

type SlotKey = 'physical' | 'technical' | 'height'

const SLOTS: { key: SlotKey; label: string }[] = [
    { key: 'physical', label: 'Physical' },
    { key: 'technical', label: 'Technical' },
    { key: 'height', label: 'Height' },
]

const TRAY_ID = 'build-pick-tray'
const LABEL = 'text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground'

function optionColumns(options: PickOption[], typed: string): TrayColumn[] {
    const needle = typed.trim().toLowerCase()
    const columns: TrayColumn[] = []
    for (const option of options) {
        let column = columns.find(c => c.key === option.rarity)
        if (!column) {
            column = { key: option.rarity, heading: option.rarity, headingClass: rarityTextClass(option.rarity), items: [] }
            columns.push(column)
        }
        if (!needle || option.name.toLowerCase().includes(needle)) column.items.push({ key: option.slug, label: option.name })
    }
    return columns
}

function heightColumns(catalog: PublicBuildCatalog): TrayColumn[] {
    return [5, 6, 7]
        .map(foot => ({
            key: String(foot),
            heading: `${foot}'`,
            items: (catalog.heights ?? []).filter(h => Math.floor(h.inches / 12) === foot).map(h => ({ key: String(h.inches), label: formatHeight(h.inches) })),
        }))
        .filter(c => c.items.length > 0)
}

function moveActive(columns: TrayColumn[], activeKey: string | null, key: string): string | null {
    const filled = columns.filter(c => c.items.length > 0)
    if (filled.length === 0) return null
    const col = filled.findIndex(c => c.items.some(i => i.key === activeKey))
    if (col < 0) return filled[0].items[0].key
    const row = filled[col].items.findIndex(i => i.key === activeKey)
    if (key === 'ArrowDown') return filled[col].items[Math.min(row + 1, filled[col].items.length - 1)].key
    if (key === 'ArrowUp') return filled[col].items[Math.max(row - 1, 0)].key
    const next = key === 'ArrowRight' ? Math.min(col + 1, filled.length - 1) : Math.max(col - 1, 0)
    return filled[next].items[Math.min(row, filled[next].items.length - 1)].key
}

interface Props {
    catalog: PublicBuildCatalog
    inspectors: Record<string, InspectorData>
}

export default function BuildsView({ catalog, inspectors }: Props) {
    const params = useInfoParams()
    const searchParams = useSearchParams()
    const filters = useMemo(() => parseBuildFilters(searchParams, catalog), [searchParams, catalog])
    const [query, setQuery] = useState('')
    const [editing, setEditing] = useState<SlotKey | null>(null)
    const [typed, setTyped] = useState('')
    const [activeKey, setActiveKey] = useState<string | null>(null)
    const [closedExact, setClosedExact] = useState<string | null>(null)
    const slotRefs = useRef<Record<SlotKey, HTMLButtonElement | null>>({ physical: null, technical: null, height: null })
    const toolsRef = useRef<HTMLDivElement>(null)
    const returnFocus = useRef<SlotKey | null>(null)

    const { groups, exact } = useMemo(() => filterBuilds(catalog, { ...filters, q: query }), [catalog, filters, query])
    const visible = groups.flatMap(g => g.builds)
    const requested = searchParams.get('build')
    const explicit = requested && visible.some(b => b.slug === requested) ? requested : null
    const openSlug = explicit ?? (exact && exact !== closedExact ? exact : null)

    const options = useMemo(
        () => (editing === 'physical' ? catalog.physicals ?? [] : editing === 'technical' ? catalog.technicals ?? [] : []),
        [editing, catalog],
    )
    const columns = useMemo(
        () => (editing === 'height' ? heightColumns(catalog) : editing ? optionColumns(options, typed) : []),
        [editing, catalog, options, typed],
    )
    const needle = typed.toLowerCase()
    const ghostOption = editing && editing !== 'height' && needle ? options.find(o => o.name.toLowerCase().startsWith(needle)) : undefined
    const ghost = ghostOption ? ghostOption.name.slice(typed.length) : ''

    useEffect(() => {
        if (editing || !returnFocus.current) return
        slotRefs.current[returnFocus.current]?.focus()
        returnFocus.current = null
    }, [editing])

    useEffect(() => {
        if (!editing) return
        const onDown = (e: PointerEvent) => {
            if (!toolsRef.current?.contains(e.target as Node)) setEditing(null)
        }
        document.addEventListener('pointerdown', onDown)
        return () => document.removeEventListener('pointerdown', onDown)
    }, [editing])

    const open = (slot: SlotKey) => {
        if (editing === slot) {
            setEditing(null)
            return
        }
        setEditing(slot)
        setTyped('')
        setActiveKey(slot === 'height' && filters.height !== undefined ? String(filters.height) : null)
        if (slot === 'height') slotRefs.current.height?.focus()
    }

    const close = () => {
        returnFocus.current = editing
        setEditing(null)
    }

    const pick = (key: string) => {
        if (!editing) return
        setClosedExact(null)
        params.set({ [editing]: key, build: null })
        close()
    }

    const clear = (slot: SlotKey) => {
        setClosedExact(null)
        params.set({ [slot]: null, build: null })
    }

    const clearAll = () => {
        setQuery('')
        setClosedExact(null)
        params.set({ physical: null, technical: null, height: null, build: null })
    }

    const toggle = (slug: string) => {
        if (slug === openSlug) {
            if (explicit) params.set({ build: null })
            if (slug === exact) setClosedExact(slug)
            return
        }
        setClosedExact(null)
        params.set({ build: slug })
    }

    const onType = (value: string) => {
        setTyped(value)
        const lower = value.toLowerCase()
        const first = lower ? options.find(o => o.name.toLowerCase().startsWith(lower)) ?? options.find(o => o.name.toLowerCase().includes(lower)) : undefined
        setActiveKey(first?.slug ?? null)
    }

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            e.preventDefault()
            close()
        } else if (e.key === 'Enter') {
            e.preventDefault()
            if (activeKey) pick(activeKey)
        } else if (e.key === 'Tab' && ghostOption) {
            e.preventDefault()
            setTyped(ghostOption.name)
            setActiveKey(ghostOption.slug)
        } else if (e.key.startsWith('Arrow')) {
            e.preventDefault()
            setActiveKey(moveActive(columns, activeKey, e.key))
        }
    }

    const slotValue = (slot: SlotKey): string | null => {
        if (slot === 'height') return filters.height !== undefined ? formatHeight(filters.height) : null
        const slug = filters[slot]
        const list = slot === 'physical' ? catalog.physicals ?? [] : catalog.technicals ?? []
        return slug ? list.find(o => o.slug === slug)?.name ?? null : null
    }

    const filtered = !!(filters.physical || filters.technical || filters.height !== undefined || query)

    return (
        <div>
            <div ref={toolsRef}>
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="flex flex-col gap-2 md:flex-row md:gap-3">
                        {SLOTS.map(slot => (
                            <BuildSlot
                                key={slot.key}
                                ref={el => {
                                    slotRefs.current[slot.key] = el
                                }}
                                label={slot.label}
                                value={slotValue(slot.key)}
                                editing={editing === slot.key}
                                typeable={slot.key !== 'height'}
                                typed={typed}
                                ghost={ghost}
                                trayId={TRAY_ID}
                                activeId={activeKey ? trayItemId(TRAY_ID, activeKey) : undefined}
                                onOpen={() => open(slot.key)}
                                onClear={() => clear(slot.key)}
                                onType={onType}
                                onKeyDown={onKeyDown}
                            />
                        ))}
                    </div>
                    <SearchBox value={query} onChange={setQuery} placeholder="Search builds" className="w-full md:w-[260px]" />
                </div>

                <Collapse open={editing !== null}>
                    <div className="relative pb-2 pt-7">
                        {editing && (
                            <button
                                type="button"
                                onMouseDown={e => e.preventDefault()}
                                onClick={close}
                                className="absolute right-0 top-7 z-10 text-xs font-medium leading-4 text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 motion-reduce:transition-none"
                            >
                                Close
                            </button>
                        )}
                        {editing && (
                            <PickTray
                                id={TRAY_ID}
                                label={SLOTS.find(s => s.key === editing)!.label}
                                columns={columns}
                                activeKey={activeKey}
                                mono={editing === 'height'}
                                onPick={pick}
                            />
                        )}
                    </div>
                </Collapse>
            </div>

            <div className="mt-9">
                {visible.length === 0 ? (
                    <div className="py-16 text-center">
                        <p className="text-base font-semibold text-foreground">{filtered ? 'No matching build' : 'No builds'}</p>
                        {filtered && (
                            <button
                                type="button"
                                onClick={clearAll}
                                className="mt-2 text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                            >
                                Clear filters
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        <div aria-hidden className={`mb-4 hidden ${BUILD_GRID} md:grid`}>
                            {['Build', 'Physical', 'Technical', 'Height', 'Effect'].map(label => <span key={label} className={LABEL}>{label}</span>)}
                        </div>
                        {groups.map((group, i) => (
                            <section key={group.rarity}>
                                <RarityHeading rarity={group.rarity} first={i === 0} />
                                {group.builds.map(build => (
                                    <BuildRow
                                        key={build.slug}
                                        build={build}
                                        open={openSlug === build.slug}
                                        onToggle={() => toggle(build.slug)}
                                        inspectors={inspectors}
                                    />
                                ))}
                            </section>
                        ))}
                    </>
                )}
            </div>
        </div>
    )
}
