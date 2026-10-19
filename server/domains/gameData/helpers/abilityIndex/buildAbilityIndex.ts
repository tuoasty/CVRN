import type { Ability, AttributeEntry, Rarity } from '../../types/datasets'
import type { AbilityAvailability, AbilityGrant, AbilityIndexEntry } from '../../types/abilityIndex'
import { NO_ROLL_VALUE } from '../datasets/crossCheck'
import { rarityForWeight } from '../datasets/rarityForWeight'
import { createVariantResolver } from './resolveVariantBase'

export interface AbilityIndexSources {
    abilities: Ability[]
    physicals?: AttributeEntry[]
    technicals?: AttributeEntry[]
    rarities?: Rarity[]
}

export function buildAbilityIndex({ abilities, physicals = [], technicals = [], rarities = [] }: AbilityIndexSources): AbilityIndexEntry[] {
    const rolls = new Map<string, { availability: AbilityAvailability; weight: number }>()
    for (const [availability, entries] of [['technical', technicals], ['physical', physicals]] as const) {
        for (const entry of entries) {
            if (entry.value !== NO_ROLL_VALUE) rolls.set(entry.value.toLowerCase(), { availability, weight: entry.weight })
        }
    }

    const keyByLower = new Map(abilities.map(a => [a.key.toLowerCase(), a.key]))
    const resolveVariant = createVariantResolver(keyByLower.values())

    return abilities.map(ability => {
        const roll = rolls.get(ability.key.toLowerCase())
        const variant = resolveVariant(ability.key)
        const grants: AbilityGrant[] = [
            ...(ability.team ?? []).map(name => ({ name, key: keyByLower.get(name.toLowerCase()), source: 'team' as const })),
            ...(ability.aura ?? []).map(name => ({ name, key: keyByLower.get(name.toLowerCase()), source: 'aura' as const })),
        ]

        const entry: AbilityIndexEntry = {
            key: ability.key,
            availability: roll?.availability ?? 'exclusive',
            isActive: !!ability.active,
            isToggle: !!ability.toggle,
            grants,
        }
        if (roll) {
            entry.weight = roll.weight
            const rarity = rarityForWeight(rarities, roll.weight)
            if (rarity) entry.rarity = rarity.name
        }
        if (variant) {
            entry.variantOf = variant.base
            entry.modifier = variant.modifier
        }
        return entry
    })
}
