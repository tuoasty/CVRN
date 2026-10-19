import type { GameDatasetPayloads } from '../../types/datasets'
import type { ResolvedBuildEffect } from '../../types/buildIndex'
import type {
    HeightColumn,
    InspectorData,
    PickOption,
    PublicAbility,
    PublicAbilityCatalog,
    PublicBuild,
    PublicBuildCatalog,
    PublicBuildEffect,
    PublicBuildPart,
} from '../../types/publicInformation'
import { formatHeight } from '@/shared/utils/height'
import { buildBuildIndex, buildEffectTarget } from '../builds/buildBuildIndex'
import { abilityHref } from './inspector'
import { toSlug } from './slug'

type PartRole = PublicBuildPart['role']

function toEffect(effect: ResolvedBuildEffect): PublicBuildEffect {
    if (effect.type === 'text') return { kind: 'text', text: effect.name }
    if (effect.type === 'bonus') return effect.key ? { kind: 'bonus', name: effect.name, target: effect.key } : { kind: 'bonus', name: effect.name }
    return { kind: 'ability', name: effect.name, target: buildEffectTarget(effect)! }
}

function heightLabel(min: number, max: number): string {
    return min === max ? formatHeight(min) : `${formatHeight(min)} to ${formatHeight(max)}`
}

function inspectorWording(data: InspectorData | undefined): string[] {
    if (!data) return []
    if (data.text) return [data.text]
    if (data.lines) return data.lines
    return (data.sheet ?? []).map(row => `${row.label} ${row.value}`)
}

export function buildBuildCatalog(
    payloads: Partial<GameDatasetPayloads>,
    abilities: PublicAbilityCatalog,
    heights: HeightColumn[],
    inspectorFor: (key: string) => InspectorData | undefined,
): PublicBuildCatalog {
    const rollable = new Map<string, PublicAbility>()
    for (const group of [...(abilities.physical ?? []), ...(abilities.technical ?? [])]) {
        for (const ability of group.abilities) rollable.set(ability.key, ability)
    }

    const part = (name: string, role: PartRole, key: string | undefined): PublicBuildPart | null => {
        const ability = key ? rollable.get(key) : undefined
        if (ability) {
            const wording = ability.source === 'original' && ability.text ? [ability.text] : ability.lines.map(l => l.text)
            return { name, role, wording, href: abilityHref(ability.kind, ability.slug) }
        }
        const wording = key ? inspectorWording(inspectorFor(key)) : []
        return wording.length > 0 ? { name, role, wording } : null
    }

    const index = buildBuildIndex({ builds: payloads.builds ?? [], passives: payloads.buildPassives ?? [], abilities: payloads.abilities ?? [] })
    const builds: PublicBuild[] = index.filter(b => b.hasEffects).map(entry => {
        const parts: PublicBuildPart[] = []
        const seen = new Set<string>()
        const add = (name: string, role: PartRole, key: string | undefined) => {
            const id = `${role}:${name}`
            if (seen.has(id)) return
            seen.add(id)
            const built = part(name, role, key)
            if (built) parts.push(built)
        }
        for (const combo of entry.combos) add(combo.physical, 'Physical', combo.physical)
        for (const combo of entry.combos) add(combo.technical, 'Technical', combo.technical)
        for (const effect of entry.effects) if (effect.type === 'bonus') add(effect.name, 'Bonus', effect.key)

        return {
            name: entry.name,
            slug: toSlug(entry.name),
            rarity: entry.rarity,
            combos: entry.combos.map(combo => ({
                physical: combo.physical,
                physicalSlug: toSlug(combo.physical),
                technical: combo.technical,
                technicalSlug: toSlug(combo.technical),
                minInches: combo.minInches,
                maxInches: combo.maxInches,
                heightLabel: heightLabel(combo.minInches, combo.maxInches),
            })),
            effects: entry.effects.map(toEffect),
            parts,
        }
    })

    const rarityOrder = [...(payloads.rarities ?? [])].sort((a, b) => a.normalPct - b.normalPct).map(r => r.name)
    const groups = rarityOrder
        .map(rarity => ({ rarity, builds: builds.filter(b => b.rarity === rarity).sort((a, b) => a.name.localeCompare(b.name)) }))
        .filter(g => g.builds.length > 0)

    const options = (kind: 'physical' | 'technical'): PickOption[] =>
        (abilities[kind] ?? []).flatMap(g => g.abilities.filter(a => a.key !== 'None').map(a => ({ slug: a.slug, name: a.key, rarity: g.rarity })))

    return {
        groups,
        physicals: options('physical'),
        technicals: options('technical'),
        heights: heights.flatMap(c => c.rows),
    }
}
