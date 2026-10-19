import type { Rarity } from '../../types/datasets'

export function rarityForWeight(rarities: Rarity[], weight: number): Rarity | undefined {
    return rarities.find(r => r.weight === weight)
}
