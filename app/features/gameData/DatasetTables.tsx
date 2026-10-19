"use client"

import { useMemo, useState } from 'react'
import { Badge } from '@/app/components/ui/badge'
import { Input } from '@/app/components/ui/input'
import type { Ability, AttributeEntry, Rarity } from '@/server/domains/gameData/types/datasets'
import type { AbilityIndexEntry } from '@/server/domains/gameData/types/abilityIndex'
import { buildAbilityIndex } from '@/server/domains/gameData/helpers/abilityIndex/buildAbilityIndex'
import type { AbilityBullet, GameTerm, TermBook } from '@/server/domains/gameData/terms/types'
import { createTermBook } from '@/server/domains/gameData/terms/template'
import { createAbilityLookup, describeAbility, type AbilityLookup } from '@/server/domains/gameData/terms/describeAbility'
import { NO_ROLL_VALUE } from '@/server/domains/gameData/helpers/datasets/crossCheck'
import { rarityForWeight } from '@/server/domains/gameData/helpers/datasets/rarityForWeight'
import { createKitResolver, resolveKit, resolveTuning, type ResolvedTune } from '@/server/domains/gameData/helpers/specLoadouts/resolveKit'
import type { SpecLoadout } from '@/server/domains/gameData/types/datasets'
import { formatGameHeight } from '@/shared/utils/height'
import { cn } from '@/lib/utils'

const TH = 'px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground'
const TD = 'px-4 py-2 align-top'
const NUM = 'font-mono tabular-nums text-right'

function Swatch({ color }: { color: string }) {
    return <span className="h-3 w-3 shrink-0 border border-border" style={{ backgroundColor: color }} />
}

export function RarityTable({ rarities }: { rarities: Rarity[] }) {
    return (
        <table className="w-full text-sm">
            <thead>
                <tr className="border-b border-border">
                    <th className={TH}>Name</th>
                    <th className={TH}>Color</th>
                    <th className={cn(TH, 'text-right')}>Weight</th>
                    <th className={cn(TH, 'text-right')}>Normal %</th>
                    <th className={cn(TH, 'text-right')}>Lucky %</th>
                </tr>
            </thead>
            <tbody>
                {rarities.map(r => (
                    <tr key={r.name} className="border-b border-border last:border-b-0">
                        <td className={cn(TD, 'font-medium')}>{r.name}</td>
                        <td className={TD}>
                            <span className="inline-flex items-center gap-2 font-mono text-xs">
                                <Swatch color={r.color} />
                                {r.color}
                            </span>
                        </td>
                        <td className={cn(TD, NUM)}>{r.weight}</td>
                        <td className={cn(TD, NUM)}>{r.normalPct}</td>
                        <td className={cn(TD, NUM)}>{r.luckyPct}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    )
}

export interface AttributeLinks {
    abilities?: Ability[]
    rarities?: Rarity[]
    physicals?: AttributeEntry[]
    technicals?: AttributeEntry[]
    terms?: GameTerm[]
}

const AVAILABILITY_LABEL: Record<AbilityIndexEntry['availability'], string> = {
    physical: 'Physical',
    technical: 'Technical',
    exclusive: 'Exclusive',
}

export function AttributeTable({ entries, links = {} }: { entries: AttributeEntry[]; links?: AttributeLinks }) {
    const { abilities, rarities, terms } = links
    const lookup = useMemo(() => (abilities ? createAbilityLookup(abilities) : undefined), [abilities])
    const book = useMemo(() => createTermBook(terms ?? []), [terms])

    return (
        <table className="w-full table-fixed text-sm">
            <colgroup>
                <col className="w-48" />
                <col className="w-32" />
                <col className="w-20" />
                <col />
            </colgroup>
            <thead>
                <tr className="border-b border-border">
                    <th className={TH}>Ability</th>
                    <th className={TH}>Rarity</th>
                    <th className={cn(TH, 'text-right')}>Weight</th>
                    <th className={TH}>Description</th>
                </tr>
            </thead>
            <tbody>
                {entries.map(e => (
                    <AttributeRow key={e.value} entry={e} lookup={lookup} rarities={rarities} book={book} />
                ))}
            </tbody>
        </table>
    )
}

function AttributeRow({ entry, lookup, rarities, book }: { entry: AttributeEntry; lookup?: AbilityLookup; rarities?: Rarity[]; book: TermBook }) {
    const noRoll = entry.value === NO_ROLL_VALUE
    const ability = noRoll ? undefined : lookup?.(entry.value)
    const rarity = noRoll || !rarities ? undefined : rarityForWeight(rarities, entry.weight)

    let name
    if (noRoll) name = <span className="text-muted-foreground">{entry.value}</span>
    else if (ability) name = ability.key
    else {
        name = (
            <>
                {entry.value}
                {lookup && <span className="ml-2 text-xs font-normal text-destructive">(not in catalog)</span>}
            </>
        )
    }

    return (
        <tr className="border-b border-border last:border-b-0">
            <td className={cn(TD, 'font-medium break-words')}>{name}</td>
            <td className={TD}>
                {rarity && (
                    <span className="inline-flex items-center gap-2">
                        <Swatch color={rarity.color} />
                        {rarity.name}
                    </span>
                )}
                {!noRoll && rarities && !rarity && <span className="text-destructive">No rarity</span>}
            </td>
            <td className={cn(TD, NUM)}>{entry.weight}</td>
            <td className={TD}>
                {noRoll && <span className="text-muted-foreground">No ability rolled</span>}
                {ability && (ability.description
                    ? <span>{ability.description}</span>
                    : <BulletList bullets={describeAbility(ability, { terms: book, lookup })} />)}
            </td>
        </tr>
    )
}

export function AbilityTable({ abilities, links = {} }: { abilities: Ability[]; links?: AttributeLinks }) {
    const [query, setQuery] = useState('')
    const [expanded, setExpanded] = useState<string | null>(null)
    const q = query.trim().toLowerCase()
    const shown = q ? abilities.filter(a => a.key.toLowerCase().includes(q)) : abilities
    const lookup = useMemo(() => createAbilityLookup(abilities), [abilities])
    const { physicals, technicals, rarities, terms } = links
    const book = useMemo(() => createTermBook(terms ?? []), [terms])
    const index = useMemo(
        () => new Map(buildAbilityIndex({ abilities, physicals, technicals, rarities }).map(e => [e.key, e])),
        [abilities, physicals, technicals, rarities],
    )
    const rarityByName = useMemo(() => new Map((rarities ?? []).map(r => [r.name, r])), [rarities])

    return (
        <div>
            <div className="p-3 border-b border-border">
                <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Filter abilities" className="h-8 max-w-xs rounded-sm" />
            </div>
            <table className="w-full table-fixed text-sm">
                <colgroup>
                    <col className="w-48" />
                    <col className="w-24" />
                    <col className="w-28" />
                    <col className="w-24" />
                    <col className="w-16" />
                    <col className="w-16" />
                    <col />
                </colgroup>
                <thead>
                    <tr className="border-b border-border">
                        <th className={TH}>Ability</th>
                        <th className={cn(TH, 'px-2')}>Source</th>
                        <th className={cn(TH, 'px-2')}>Rarity</th>
                        <th className={cn(TH, 'px-2')}>Kind</th>
                        <th className={cn(TH, 'px-2 text-right')}>Eff.</th>
                        <th className={cn(TH, 'px-2 text-right')}>Par.</th>
                        <th className={TH}>Description</th>
                    </tr>
                </thead>
                <tbody>
                    {shown.map(a => (
                        <AbilityRow
                            key={a.key}
                            ability={a}
                            entry={index.get(a.key)}
                            showSource={!!(physicals || technicals)}
                            rarity={rarityByName.get(index.get(a.key)?.rarity ?? '')}
                            lookup={lookup}
                            book={book}
                            expanded={expanded === a.key}
                            onToggle={() => setExpanded(e => (e === a.key ? null : a.key))}
                        />
                    ))}
                </tbody>
            </table>
        </div>
    )
}

function BulletList({ bullets }: { bullets: AbilityBullet[] }) {
    if (bullets.length === 0) return <span className="text-muted-foreground">No description</span>
    return (
        <ul className="list-disc pl-4 space-y-0.5">
            {bullets.map((b, i) => (
                <li key={i} className={cn(!b.mapped && 'text-destructive')}>
                    {b.text}
                    {b.guess && <span className="ml-2 text-xs text-muted-foreground">(guess)</span>}
                    {b.grants && !b.children && <span className="ml-2 text-xs text-destructive">(not in catalog)</span>}
                    {b.children && b.children.length > 0 && (
                        <div className="mt-0.5 text-muted-foreground">
                            <BulletList bullets={b.children} />
                        </div>
                    )}
                </li>
            ))}
        </ul>
    )
}

interface AbilityRowProps {
    ability: Ability
    entry?: AbilityIndexEntry
    showSource: boolean
    rarity?: Rarity
    lookup: AbilityLookup
    book: TermBook
    expanded: boolean
    onToggle: () => void
}

function AbilityRow({ ability, entry, showSource, rarity, lookup, book, expanded, onToggle }: AbilityRowProps) {
    const bullets = useMemo(() => describeAbility(ability, { terms: book, lookup }), [ability, lookup, book])
    const kinds = [
        ability.active && 'Active',
        ability.toggle && 'Toggle',
        ability.team && 'Team',
        ability.aura && 'Aura',
        ability.extra && 'Extra',
    ].filter((k): k is string => !!k)

    return (
        <>
            <tr onClick={onToggle} className="cursor-pointer border-b border-border hover:bg-muted/30">
                <td className={cn(TD, 'break-words')}>
                    <span className="font-medium">{ability.key}</span>
                    {entry?.variantOf && (
                        <span className="block text-xs text-muted-foreground">
                            Variant of {entry.variantOf}
                            {entry.modifier && <span className="ml-1">({entry.modifier})</span>}
                        </span>
                    )}
                </td>
                <td className={cn(TD, 'px-2', entry?.availability === 'exclusive' && 'text-muted-foreground')}>
                    {entry && showSource && AVAILABILITY_LABEL[entry.availability]}
                </td>
                <td className={cn(TD, 'px-2')}>
                    {rarity && (
                        <span className="inline-flex items-center gap-2">
                            <Swatch color={rarity.color} />
                            {rarity.name}
                        </span>
                    )}
                </td>
                <td className={cn(TD, 'px-2')}>
                    <span className="flex flex-wrap gap-1">
                        {kinds.map(k => (
                            <Badge key={k} variant="outline" className="rounded-sm text-xs uppercase">{k}</Badge>
                        ))}
                    </span>
                </td>
                <td className={cn(TD, NUM, 'px-2')}>{ability.effects.length || ''}</td>
                <td className={cn(TD, NUM, 'px-2')}>{Object.keys(ability.params).length || ''}</td>
                <td className={TD}>
                    {ability.description
                        ? <span>{ability.description}</span>
                        : <BulletList bullets={bullets} />}
                </td>
            </tr>
            {expanded && (
                <tr className="border-b border-border bg-muted/20">
                    <td colSpan={7} className="px-4 py-3 space-y-3">
                        {ability.description && (
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Generated wording</p>
                                <BulletList bullets={bullets} />
                            </div>
                        )}
                        <pre className="font-mono text-xs whitespace-pre-wrap">{JSON.stringify(ability, null, 2)}</pre>
                    </td>
                </tr>
            )}
        </>
    )
}

function tuneText(tune: ResolvedTune): string {
    return tune.before === null
        ? `${tune.ability} ${tune.path} = ${tune.value}`
        : `${tune.ability} ${tune.before} → ${tune.value}`
}

export function SpecLoadoutTable({ loadouts, links = {} }: { loadouts: SpecLoadout[]; links?: AttributeLinks }) {
    const [query, setQuery] = useState('')
    const q = query.trim().toLowerCase()
    const shown = q ? loadouts.filter(l => l.key.toLowerCase().includes(q)) : loadouts
    const { abilities } = links
    const rows = useMemo(() => {
        const abilityByKey = new Map((abilities ?? []).map(a => [a.key, a]))
        const resolve = createKitResolver(abilityByKey.keys())
        return new Map(loadouts.map(l => {
            const kit = resolveKit(l, resolve)
            return [l.key, { text: kit.filter(e => e.tier === 'text').length, tunes: resolveTuning(l, kit, abilityByKey) }]
        }))
    }, [loadouts, abilities])

    return (
        <div>
            <div className="p-3 border-b border-border">
                <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Filter specs" className="h-8 max-w-xs rounded-sm" />
            </div>
            <table className="w-full table-fixed text-sm">
                <colgroup>
                    <col className="w-56" />
                    <col className="w-20" />
                    <col className="w-20" />
                    <col className="w-20" />
                    <col className="w-24" />
                    <col />
                </colgroup>
                <thead>
                    <tr className="border-b border-border">
                        <th className={TH}>Spec</th>
                        <th className={cn(TH, 'px-2 text-right')}>Height</th>
                        <th className={cn(TH, 'px-2 text-right')}>Passive</th>
                        <th className={cn(TH, 'px-2 text-right')}>Active</th>
                        <th className={cn(TH, 'px-2 text-right')}>Plain text</th>
                        <th className={TH}>Tunes</th>
                    </tr>
                </thead>
                <tbody>
                    {shown.map(l => {
                        const row = rows.get(l.key)
                        return (
                            <tr key={l.key} className="border-b border-border last:border-b-0">
                                <td className={cn(TD, 'font-medium')}>{l.key}</td>
                                <td className={cn(TD, NUM, 'px-2')}>{formatGameHeight(l.height)}</td>
                                <td className={cn(TD, NUM, 'px-2')}>{l.passive.length}</td>
                                <td className={cn(TD, NUM, 'px-2')}>{l.active.length}</td>
                                <td className={cn(TD, NUM, 'px-2')}>{row?.text ?? 0}</td>
                                <td className={TD}>
                                    {row?.tunes.length
                                        ? <ul className="space-y-0.5 font-mono text-xs tabular-nums text-secondary">{row.tunes.map((t, i) => <li key={i}>{tuneText(t)}</li>)}</ul>
                                        : <span className="text-muted-foreground">None</span>}
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}
