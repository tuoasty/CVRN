import type { Ability, GameDatasetPayloads } from '../../types/datasets'
import type { AbilityIndexEntry } from '../../types/abilityIndex'
import type { AbilityMarker, PublicAbility, PublicAbilityCatalog, PublicAbilityKind, RarityGroup } from '../../types/publicInformation'
import { buildAbilityIndex } from '../abilityIndex/buildAbilityIndex'
import { describeAbility } from '../../terms/describeAbility'
import { resolveDescriptionSource } from '../../terms/descriptionSource'
import type { InspectorContext } from './inspector'
import { toSlug } from './slug'

function marker(ability: Ability): AbilityMarker {
    if (ability.active) return ability.active.cooldown === undefined ? { kind: 'active' } : { kind: 'active', cooldown: ability.active.cooldown }
    if (ability.toggle) return { kind: 'toggle' }
    return null
}

function toPublicAbility(ability: Ability, kind: PublicAbilityKind, rarity: string, ctx: InspectorContext): PublicAbility {
    const { source } = resolveDescriptionSource(ability, ctx.settings[ability.key])
    const base = { key: ability.key, slug: toSlug(ability.key), kind, rarity, marker: marker(ability) }

    if (source === 'original' && ability.description) {
        return { ...base, source, summary: ability.description, text: ability.description, lines: [] }
    }

    const bullets = describeAbility(ability, ctx.context)
    const lines = bullets.map(b => {
        const target = b.grants ? ctx.context.lookup?.(b.grants) : undefined
        return target ? { text: b.text, grants: target.key } : { text: b.text }
    })
    const summary = bullets.find(b => b.source !== 'active' && b.source !== 'toggle')?.text ?? ''
    return { ...base, source: 'derived', summary, lines }
}

export function buildAbilityCatalog(payloads: Partial<GameDatasetPayloads>, ctx: InspectorContext): PublicAbilityCatalog {
    const abilities = payloads.abilities ?? []
    const rarities = [...(payloads.rarities ?? [])].sort((a, b) => a.normalPct - b.normalPct)
    const index = buildAbilityIndex({ abilities, physicals: payloads.physicals ?? [], technicals: payloads.technicals ?? [], rarities })
    const entryByKey = new Map<string, AbilityIndexEntry>(index.map(e => [e.key, e]))

    const groupsFor = (kind: PublicAbilityKind): RarityGroup[] => {
        const groups = rarities.map(r => ({ rarity: r.name, normalPct: r.normalPct, luckyPct: r.luckyPct, abilities: [] as PublicAbility[] }))
        const byRarity = new Map(groups.map(g => [g.rarity, g]))
        for (const ability of abilities) {
            const entry = entryByKey.get(ability.key)
            if (entry?.availability !== kind || !entry.rarity) continue
            byRarity.get(entry.rarity)?.abilities.push(toPublicAbility(ability, kind, entry.rarity, ctx))
        }
        for (const group of groups) group.abilities.sort((a, b) => a.key.localeCompare(b.key))
        return groups.filter(g => g.abilities.length > 0)
    }

    return { physical: groupsFor('physical'), technical: groupsFor('technical') }
}

export function findAbility(catalog: PublicAbilityCatalog, kind: PublicAbilityKind, slug: string): PublicAbility | null {
    for (const group of catalog[kind] ?? []) {
        const found = group.abilities.find(a => a.slug === slug)
        if (found) return found
    }
    return null
}
