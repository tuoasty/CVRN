const RARITY_TEXT: Record<string, string> = {
    rare: 'text-rarity-rare',
    epic: 'text-rarity-epic',
    mythical: 'text-rarity-mythic',
    mythic: 'text-rarity-mythic',
}

export function rarityTextClass(rarity: string): string {
    return RARITY_TEXT[rarity.toLowerCase()] ?? 'text-foreground'
}
