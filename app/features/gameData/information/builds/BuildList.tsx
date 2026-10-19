"use client"

import { useMemo, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import type { BuildIndexEntry, ResolvedBuildEffect } from '@/server/domains/gameData/types/buildIndex'
import { buildEffectTarget } from '@/server/domains/gameData/helpers/builds/buildBuildIndex'
import { indexLabel } from '@/server/domains/gameData/helpers/specLoadouts/loadoutView'
import { formatHeight } from '@/shared/utils/height'
import { cn } from '@/lib/utils'
import AbilityLines from '../AbilityLines'
import { useInformation } from '../InformationProvider'

function rangeText(minInches: number, maxInches: number): string {
    return minInches === maxInches ? formatHeight(minInches) : `${formatHeight(minInches)} to ${formatHeight(maxInches)}`
}

function matches(build: BuildIndexEntry, q: string): boolean {
    if (!q) return true
    const names = [build.name, ...build.combos.flatMap(c => [c.physical, c.technical]), ...build.effects.map(e => e.name)]
    return names.some(n => n.toLowerCase().includes(q))
}

function EffectLabel({ effect }: { effect: ResolvedBuildEffect }) {
    const { index } = useInformation()
    const target = buildEffectTarget(effect)
    const kind = indexLabel(target ? index.get(target) : undefined)

    return (
        <span className="min-w-0">
            {effect.type === 'bonus' && <span className="text-muted-foreground">Bonus ability: </span>}
            <span className={cn(target && 'font-medium text-foreground')}>{effect.name}</span>
            {effect.type === 'variant' && <span className="ml-2 text-xs text-muted-foreground">variant of {effect.base}</span>}
            {effect.type === 'bonus' && !effect.key && <span className="ml-2 text-xs text-destructive">(not in catalog)</span>}
            {kind && <span className="ml-2 text-xs text-muted-foreground">{kind}</span>}
        </span>
    )
}

function BuildRow({ build }: { build: BuildIndexEntry }) {
    const { abilityByKey } = useInformation()
    const [open, setOpen] = useState<number | null>(null)
    const openTarget = open === null ? undefined : buildEffectTarget(build.effects[open])
    const openAbility = openTarget ? abilityByKey.get(openTarget) : undefined

    return (
        <div className="py-2.5">
            <div className="grid grid-cols-[200px_minmax(0,1fr)_minmax(0,1fr)] gap-x-6 text-sm">
                <div className="min-w-0">
                    <span className={cn('font-semibold', !build.hasEffects && 'text-muted-foreground')}>{build.name}</span>
                    {!build.hasEffects && <span className="block text-xs text-muted-foreground">Hidden: no effects</span>}
                </div>
                <ul className="space-y-0.5">
                    {build.combos.map((c, i) => (
                        <li key={i} className="flex flex-wrap items-baseline gap-x-3">
                            <span>{c.physical} / {c.technical}</span>
                            <span className="font-mono text-xs tabular-nums text-muted-foreground">{rangeText(c.minInches, c.maxInches)}</span>
                        </li>
                    ))}
                </ul>
                {build.hasEffects ? (
                    <ul>
                        {build.effects.map((effect, i) => {
                            const target = buildEffectTarget(effect)
                            const editable = !!target && abilityByKey.has(target)
                            return (
                                <li key={i}>
                                    {editable ? (
                                        <button
                                            type="button"
                                            aria-expanded={open === i}
                                            onClick={() => setOpen(current => (current === i ? null : i))}
                                            className="grid w-full grid-cols-[14px_1fr] items-baseline gap-x-2 rounded-sm py-0.5 text-left transition-colors duration-150 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 motion-reduce:transition-none"
                                        >
                                            <ChevronRight aria-hidden className={cn('h-3.5 w-3.5 translate-y-0.5 text-muted-foreground transition-transform duration-150 motion-reduce:transition-none', open === i && 'rotate-90')} />
                                            <EffectLabel effect={effect} />
                                        </button>
                                    ) : (
                                        <div className="grid grid-cols-[14px_1fr] items-baseline gap-x-2 py-0.5">
                                            <span />
                                            <EffectLabel effect={effect} />
                                        </div>
                                    )}
                                </li>
                            )
                        })}
                    </ul>
                ) : <span className="text-muted-foreground">None</span>}
            </div>
            {openAbility && (
                <div className="mt-2 pb-2 pl-[224px]">
                    <AbilityLines key={openAbility.key} ability={openAbility} />
                </div>
            )}
        </div>
    )
}

export default function BuildList() {
    const { buildIndex, rarities } = useInformation()
    const [filter, setFilter] = useState('')
    const q = filter.trim().toLowerCase()

    const groups = useMemo(() => {
        const order = [...rarities].sort((a, b) => a.weight - b.weight).map(r => r.name)
        const rank = (rarity: string) => {
            const at = order.indexOf(rarity)
            return at === -1 ? order.length : at
        }
        const byRarity = new Map<string, BuildIndexEntry[]>()
        for (const build of buildIndex.filter(b => matches(b, q))) {
            byRarity.set(build.rarity, [...(byRarity.get(build.rarity) ?? []), build])
        }
        return [...byRarity.entries()]
            .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
            .map(([rarity, builds]) => ({ rarity, builds: builds.sort((a, b) => a.name.localeCompare(b.name)) }))
    }, [buildIndex, rarities, q])

    if (buildIndex.length === 0) {
        return <p className="py-24 text-center text-sm text-muted-foreground">No builds stored yet. Import them first.</p>
    }

    return (
        <div className="mt-6">
            <div className="flex max-w-xs items-center border-b border-border">
                <input
                    value={filter}
                    onChange={e => setFilter(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Escape') { setFilter(''); e.currentTarget.blur() } }}
                    placeholder="Filter builds or abilities"
                    aria-label="Filter builds or abilities"
                    className="min-w-0 flex-1 bg-transparent py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none"
                />
            </div>
            {groups.length === 0 && <p className="py-6 text-sm text-muted-foreground">No build matches &ldquo;{filter}&rdquo;.</p>}
            {groups.map(group => (
                <section key={group.rarity} aria-label={group.rarity} className="mt-8">
                    <h2 className="flex items-baseline gap-2 border-b border-border pb-1.5 text-sm font-semibold">
                        {group.rarity}
                        <span className="font-mono text-xs font-normal tabular-nums text-muted-foreground">{group.builds.length}</span>
                    </h2>
                    <div className="divide-y divide-border">
                        {group.builds.map(build => <BuildRow key={build.name} build={build} />)}
                    </div>
                </section>
            ))}
        </div>
    )
}
