import type { CardGroup } from '@/server/domains/playerCard'

export function bulkControlState(p: {
    regionSelected: boolean
    group: Pick<CardGroup, 'name' | 'isActive' | 'templates' | 'layers'> | null
    dirty: boolean
    running: boolean
    regionPlayerIds: string[]
    playerIdsWithCards: string[]
}): { problem: string | null; missingCount: number; redoCount: number } {
    const withCards = new Set(p.playerIdsWithCards)
    return {
        problem: bulkProblem(p),
        missingCount: p.regionPlayerIds.filter(id => !withCards.has(id)).length,
        redoCount: p.regionPlayerIds.length,
    }
}

function bulkProblem(p: {
    regionSelected: boolean
    group: Pick<CardGroup, 'name' | 'isActive' | 'templates' | 'layers'> | null
    dirty: boolean
    running: boolean
}): string | null {
    if (p.running) return 'A bulk generation is running'
    if (!p.regionSelected) return 'Choose a region to generate in bulk'
    if (!p.group) return 'Choose a card group'
    if (!p.group.isActive) return `${p.group.name} is inactive`
    if (p.group.templates.length === 0) return `${p.group.name} has no tiers yet`
    if (!p.group.layers || p.group.layers.length === 0) return `${p.group.name} has no saved layout`
    if (p.dirty) return 'Save or discard layout changes first'
    return null
}
