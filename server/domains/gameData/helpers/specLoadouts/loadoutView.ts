import { POSITIONS } from '@/shared/volleyball/positions'
import type { KitSlot, SpecLoadout } from '../../types/datasets'
import type { AbilityIndexEntry } from '../../types/abilityIndex'
import type { KitEntry, ResolvedTune } from './resolveKit'

export interface LoadoutRow {
    gameKey: string
    label: string
    stars: number | null
    state: 'linked' | 'unlinked' | 'skipped'
    vaulted: boolean
}

export interface LoadoutGroup {
    label: string
    rows: LoadoutRow[]
}

export interface KitSections {
    passive: KitEntry[]
    active: KitEntry[]
    text: KitEntry[]
}

const EFFECT_AMOUNT = /^Effects\.(\d+)\.Amount$/

const byStarsThenLabel = (a: LoadoutRow, b: LoadoutRow) =>
    Number(a.vaulted) - Number(b.vaulted) || (b.stars ?? 0) - (a.stars ?? 0) || a.label.localeCompare(b.label)

export function groupLoadouts(
    loadouts: SpecLoadout[],
    specByGameKey: ReadonlyMap<string, { name: string; stars: number; position: string; is_vaulted?: boolean }>,
    skipped: ReadonlySet<string>,
    filter: string,
): LoadoutGroup[] {
    const q = filter.trim().toLowerCase()
    const byPosition = new Map<string, LoadoutRow[]>()
    const unlinked: LoadoutRow[] = []
    const skippedRows: LoadoutRow[] = []

    for (const l of loadouts) {
        const spec = specByGameKey.get(l.key)
        const label = spec ? spec.name : l.name
        if (q && !label.toLowerCase().includes(q) && !l.key.toLowerCase().includes(q)) continue
        if (spec) {
            const rows = byPosition.get(spec.position) ?? []
            rows.push({ gameKey: l.key, label, stars: spec.stars, state: 'linked', vaulted: spec.is_vaulted === true })
            byPosition.set(spec.position, rows)
        } else if (skipped.has(l.key)) skippedRows.push({ gameKey: l.key, label, stars: null, state: 'skipped', vaulted: false })
        else unlinked.push({ gameKey: l.key, label, stars: null, state: 'unlinked', vaulted: false })
    }

    const groups: LoadoutGroup[] = POSITIONS.map(p => ({ label: p.shortLabel, rows: byPosition.get(p.code) ?? [] }))
    for (const [code, rows] of byPosition) if (!POSITIONS.some(p => p.code === code)) groups.push({ label: code, rows })
    groups.push({ label: 'Not linked', rows: unlinked }, { label: 'Skipped', rows: skippedRows })
    return groups.filter(g => g.rows.length > 0).map(g => ({ ...g, rows: [...g.rows].sort(byStarsThenLabel) }))
}

export function specPopLine(l: SpecLoadout): string {
    const parts = [`${l.cooldown}s cooldown`]
    if (l.lifetime !== undefined) parts.push(`lasts ${l.lifetime}s`)
    if (l.endOnSpike) parts.push('ends on spike')
    parts.push(l.activeMaxPower === l.maxPower ? `max power ${l.maxPower}` : `max power ${l.maxPower} → ${l.activeMaxPower}`)
    return parts.join(' · ')
}

export function kitSections(kit: KitEntry[]): KitSections {
    const sections: KitSections = { passive: [], active: [], text: [] }
    for (const entry of kit) {
        if (entry.tier === 'text') sections.text.push(entry)
        else if (entry.slot === 'Passive') sections.passive.push(entry)
        else sections.active.push(entry)
    }
    return sections
}

export function indexLabel(entry: AbilityIndexEntry | undefined): string {
    if (!entry) return ''
    if (entry.availability === 'exclusive') return 'Exclusive'
    const base = entry.availability === 'physical' ? 'Physical' : 'Technical'
    return entry.rarity ? `${base} · ${entry.rarity}` : base
}

export function tuneNotes(tunes: ResolvedTune[], slot: KitSlot, target: string): { byEffect: Map<number, string>; other: string[] } {
    const byEffect = new Map<number, string>()
    const other: string[] = []
    for (const tune of tunes) {
        if (tune.slot !== slot || tune.target !== target) continue
        const match = EFFECT_AMOUNT.exec(tune.path)
        if (match && tune.before !== null) byEffect.set(Number(match[1]), `This spec: ${tune.before} → ${tune.value}`)
        else other.push(`This spec: ${tune.path} = ${tune.value}`)
    }
    return { byEffect, other }
}

export function requirementStatus(regionIds: Iterable<string>, regions: { id: string; code: string }[], order: readonly string[]): { code: string; set: boolean }[] {
    const setCodes = new Set<string>()
    const codeById = new Map(regions.map(r => [r.id, r.code]))
    for (const id of regionIds) {
        const code = codeById.get(id)
        if (code) setCodes.add(code)
    }
    return order.map(code => ({ code, set: setCodes.has(code) }))
}
