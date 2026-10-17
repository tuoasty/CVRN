import type { AbilityIndexEntry } from '@/server/domains/gameData/types/abilityIndex'

const DOTS: Record<string, string> = {
    common: 'bg-muted-foreground',
    rare: 'bg-rarity-rare',
    epic: 'bg-rarity-epic',
    mythical: 'bg-rarity-mythic',
    mythic: 'bg-rarity-mythic',
}

export function rarityDotClass(rarity: string | undefined): string {
    return (rarity && DOTS[rarity.toLowerCase()]) || 'bg-border'
}

export function abilityHref(key: string, entry: AbilityIndexEntry | undefined): string {
    const tab = entry?.availability === 'exclusive' ? 'exclusives' : 'rollables'
    return `/admin/game-data/${tab}?ability=${encodeURIComponent(key)}`
}

export const AVAILABILITY_LABELS: Record<AbilityIndexEntry['availability'], string> = {
    physical: 'Physical',
    technical: 'Technical',
    exclusive: 'Exclusive',
}
