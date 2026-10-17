export type AbilityAvailability = 'physical' | 'technical' | 'exclusive'

export interface VariantMatch {
    base: string
    modifier: string
}

export interface AbilityGrant {
    name: string
    key?: string
    source: 'team' | 'aura'
}

export interface AbilityIndexEntry {
    key: string
    availability: AbilityAvailability
    rarity?: string
    weight?: number
    isActive: boolean
    isToggle: boolean
    variantOf?: string
    modifier?: string
    grants: AbilityGrant[]
}
