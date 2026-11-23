"use client"

import { useEffect, useMemo, useRef, useState } from 'react'
import { InlineSwitch } from '@/app/components/filters/InlineSwitch'
import type { HeightColumn, InspectorData, PublicAbilityCatalog, PublicServeStyle, RarityGroup } from '@/server/domains/gameData'
import RarityHeading from '../RarityHeading'
import SearchBox from '../SearchBox'
import { useInfoParams } from '../useInfoParams'
import AbilityRow from './AbilityRow'
import HeightsTable from './HeightsTable'
import ServeStylesTable from './ServeStylesTable'

type AbilityTab = 'physical' | 'technical' | 'heights' | 'serves'

const TABS = [
    { value: 'physical', label: 'Physicals' },
    { value: 'technical', label: 'Technicals' },
    { value: 'heights', label: 'Heights' },
    { value: 'serves', label: 'Serves' },
] as const satisfies readonly { value: AbilityTab; label: string }[]

function parseTab(raw: string | null): AbilityTab {
    return TABS.some(t => t.value === raw) ? (raw as AbilityTab) : 'physical'
}

function filterGroups(groups: RarityGroup[], query: string): RarityGroup[] {
    const needle = query.trim().toLowerCase()
    if (!needle) return groups
    return groups
        .map(g => ({ ...g, abilities: g.abilities.filter(a => a.key.toLowerCase().includes(needle)) }))
        .filter(g => g.abilities.length > 0)
}

interface Props {
    catalog: PublicAbilityCatalog
    heights: HeightColumn[]
    serveStyles: PublicServeStyle[]
    inspectors: Record<string, InspectorData>
}

export default function AbilitiesView({ catalog, heights, serveStyles, inspectors }: Props) {
    const params = useInfoParams()
    const tab = parseTab(params.get('type'))
    const requested = params.get('ability')
    const [query, setQuery] = useState('')
    const [mounted, setMounted] = useState(false)
    const scrolledFor = useRef<string | null>(null)

    const groups = useMemo(() => (tab === 'heights' || tab === 'serves' ? [] : filterGroups(catalog[tab] ?? [], query)), [catalog, tab, query])
    const openSlug = mounted ? requested : null

    useEffect(() => setMounted(true), [])

    useEffect(() => {
        if (!mounted || !requested || scrolledFor.current === requested) return
        scrolledFor.current = requested
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        document.getElementById(`ability-${requested}`)?.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' })
    }, [mounted, requested])

    const switchTab = (next: AbilityTab) => {
        setQuery('')
        params.set({ type: next === 'physical' ? null : next, ability: null })
    }

    const select = (slug: string, expandable: boolean) => {
        scrolledFor.current = slug
        if (expandable) params.set({ ability: openSlug === slug ? null : slug })
        else if (openSlug) params.set({ ability: null })
    }

    return (
        <div>
            <div className="mb-9 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <InlineSwitch label="Ability type" options={TABS} value={tab} onChange={switchTab} className="-ml-2" />
                {tab !== 'heights' && tab !== 'serves' && (
                    <SearchBox value={query} onChange={setQuery} placeholder="Search abilities" className="w-full md:w-[260px]" />
                )}
            </div>

            {tab === 'heights' ? (
                <HeightsTable columns={heights} />
            ) : tab === 'serves' ? (
                <ServeStylesTable styles={serveStyles} />
            ) : groups.length === 0 ? (
                <p className="py-16 text-center text-sm text-muted-foreground">{query ? 'No matching ability' : 'No abilities'}</p>
            ) : (
                groups.map((group, i) => (
                    <section key={group.rarity}>
                        <RarityHeading rarity={group.rarity} normalPct={group.normalPct} luckyPct={group.luckyPct} first={i === 0} />
                        {group.abilities.map(ability => (
                            <AbilityRow
                                key={ability.slug}
                                ability={ability}
                                open={openSlug === ability.slug}
                                onSelect={expandable => select(ability.slug, expandable)}
                                inspectors={inspectors}
                            />
                        ))}
                    </section>
                ))
            )}
        </div>
    )
}
