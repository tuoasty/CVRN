import type { Ability } from '../types/datasets'
import type { DescriptionSource } from '../types/schemas'

export interface ResolvedDescriptionSource {
    source: DescriptionSource
    switchable: boolean
}

export function resolveDescriptionSource(ability: Ability, setting: DescriptionSource | undefined): ResolvedDescriptionSource {
    if (!ability.description?.trim()) return { source: 'derived', switchable: false }
    return { source: setting ?? 'original', switchable: true }
}
