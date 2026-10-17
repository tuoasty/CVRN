"use client"

import { useCallback, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { AbilityIndexEntry } from '@/server/domains/gameData/types/abilityIndex'
import AbilityList, { type ListGroup } from './AbilityList'
import AbilityEditor from './AbilityEditor'
import { useInformation } from './InformationProvider'
import { useListKeys } from './useListKeys'

type Scope = 'rollable' | 'exclusive'

const inScope = (entry: AbilityIndexEntry | undefined, scope: Scope): entry is AbilityIndexEntry =>
    entry !== undefined && (scope === 'exclusive') === (entry.availability === 'exclusive')

export default function AbilityBrowser({ scope }: { scope: Scope }) {
    const { abilities, abilityByKey, index, rarities, attention } = useInformation()
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const filterRef = useRef<HTMLInputElement>(null)
    const [filter, setFilter] = useState('')

    const groups = useMemo<ListGroup[]>(() => {
        const rank = new Map([...rarities].sort((a, b) => a.weight - b.weight).map((r, i) => [r.name, i]))
        const needle = filter.trim().toLowerCase()
        const item = (key: string) => ({ key, rarity: index.get(key)?.rarity, attention: attention.has(key) })
        const entries = abilities
            .map(a => index.get(a.key))
            .filter((e): e is AbilityIndexEntry => inScope(e, scope))
            .filter(e => !needle || e.key.toLowerCase().includes(needle))
        if (scope === 'exclusive') {
            return [{ label: null, items: entries.map(e => e.key).sort((a, b) => a.localeCompare(b)).map(item) }]
        }
        const rarityRank = (key: string) => rank.get(index.get(key)?.rarity ?? '') ?? rank.size
        const byRarity = (a: string, b: string) => rarityRank(a) - rarityRank(b) || a.localeCompare(b)
        const of = (availability: 'physical' | 'technical') =>
            entries.filter(e => e.availability === availability).map(e => e.key).sort(byRarity).map(item)
        return [{ label: 'Physicals', items: of('physical') }, { label: 'Technicals', items: of('technical') }]
    }, [abilities, index, rarities, attention, scope, filter])

    const flat = useMemo(() => groups.flatMap(g => g.items.map(i => i.key)), [groups])
    const requested = searchParams.get('ability')
    const selected = requested && inScope(index.get(requested), scope) ? requested : flat[0] ?? null

    const select = useCallback((key: string) => {
        router.replace(`${pathname}?ability=${encodeURIComponent(key)}`, { scroll: false })
    }, [router, pathname])

    const move = useCallback((delta: 1 | -1) => {
        if (flat.length === 0) return
        const at = selected ? flat.indexOf(selected) : -1
        const next = at === -1 ? 0 : Math.min(flat.length - 1, Math.max(0, at + delta))
        select(flat[next])
    }, [flat, selected, select])

    const focusFilter = useCallback(() => filterRef.current?.focus(), [])
    useListKeys(move, focusFilter)

    const ability = selected ? abilityByKey.get(selected) : undefined

    return (
        <div className="mt-6 flex items-start">
            <aside className="sticky top-4 max-h-[calc(100vh-2rem)] w-60 shrink-0 overflow-y-auto pr-3">
                <AbilityList
                    groups={groups}
                    selected={selected}
                    filter={filter}
                    filterRef={filterRef}
                    onFilter={setFilter}
                    onSelect={select}
                    onMove={move}
                />
            </aside>
            <section aria-label="Ability editor" className="min-h-[60vh] min-w-0 flex-1 border-l border-border pl-8">
                {ability
                    ? <AbilityEditor key={ability.key} ability={ability} />
                    : <p className="py-16 text-sm text-muted-foreground">No abilities stored yet. Import the game data first.</p>}
            </section>
        </div>
    )
}
