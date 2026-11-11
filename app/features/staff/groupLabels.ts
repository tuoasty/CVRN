import type { AccessGroup } from '@/shared/types/accessGroup'

export const GROUP_LABELS: Record<AccessGroup, string> = {
    super_admin: 'Super admin',
    admin: 'Admin',
    transaction: 'Transaction',
    graphics: 'Graphics',
    media: 'Media',
    articles: 'Articles',
    information: 'Information',
    statistics: 'Statistics',
    specs: 'Specs',
    player_cards: 'Player cards',
    awards: 'Awards',
}

export function groupList(groups: readonly AccessGroup[]): string {
    return groups.map(g => GROUP_LABELS[g]).join(', ')
}
