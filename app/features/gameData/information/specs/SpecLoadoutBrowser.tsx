"use client"

import { useCallback, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { groupLoadouts } from '@/server/domains/gameData/helpers/specLoadouts/loadoutView'
import { positionShortLabel } from '@/shared/volleyball/positions'
import { useInformation } from '../InformationProvider'
import { useListKeys } from '../useListKeys'
import SpecLoadoutList from './SpecLoadoutList'
import SpecLoadoutDetail from './SpecLoadoutDetail'

export default function SpecLoadoutBrowser() {
    const { loadouts, specByGameKey, skipped } = useInformation()
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const filterRef = useRef<HTMLInputElement>(null)
    const [filter, setFilter] = useState('')
    const [openVaulted, setOpenVaulted] = useState<ReadonlySet<string>>(() => {
        const key = searchParams.get('spec')
        const spec = key ? specByGameKey.get(key) : undefined
        return spec?.is_vaulted ? new Set([positionShortLabel(spec.position)]) : new Set()
    })

    const groups = useMemo(() => groupLoadouts(loadouts, specByGameKey, skipped, filter), [loadouts, specByGameKey, skipped, filter])
    const showVaulted = useCallback((label: string) => filter.trim() !== '' || openVaulted.has(label), [filter, openVaulted])
    const flat = useMemo(
        () => groups.flatMap(g => g.rows.filter(r => !r.vaulted || showVaulted(g.label)).map(r => r.gameKey)),
        [groups, showVaulted],
    )

    const toggleVaulted = useCallback((label: string) => {
        setOpenVaulted(current => {
            const next = new Set(current)
            if (next.has(label)) next.delete(label)
            else next.add(label)
            return next
        })
    }, [])
    const requested = searchParams.get('spec')
    const selected = requested && loadouts.some(l => l.key === requested) ? requested : flat[0] ?? null

    const select = useCallback((key: string) => {
        router.replace(`${pathname}?spec=${encodeURIComponent(key)}`, { scroll: false })
    }, [router, pathname])

    const move = useCallback((delta: 1 | -1) => {
        if (flat.length === 0) return
        const at = selected ? flat.indexOf(selected) : -1
        const next = at === -1 ? 0 : Math.min(flat.length - 1, Math.max(0, at + delta))
        select(flat[next])
    }, [flat, selected, select])

    const focusFilter = useCallback(() => filterRef.current?.focus(), [])
    useListKeys(move, focusFilter)

    if (loadouts.length === 0) {
        return <p className="py-24 text-center text-sm text-muted-foreground">No spec loadouts stored yet. Import them first.</p>
    }

    const loadout = selected ? loadouts.find(l => l.key === selected) : undefined

    return (
        <div className="mt-6 flex items-start">
            <aside className="sticky top-4 max-h-[calc(100vh-2rem)] w-60 shrink-0 overflow-y-auto pr-3">
                <SpecLoadoutList
                    groups={groups}
                    selected={selected}
                    filter={filter}
                    filterRef={filterRef}
                    onFilter={setFilter}
                    showVaulted={showVaulted}
                    onToggleVaulted={toggleVaulted}
                    onSelect={select}
                    onMove={move}
                />
            </aside>
            <section aria-label="Spec loadout" className="min-h-[60vh] min-w-0 flex-1 border-l border-border pl-8">
                {loadout && <SpecLoadoutDetail key={loadout.key} loadout={loadout} />}
            </section>
        </div>
    )
}
