import type { PublicSpecKit } from '@/server/domains/gameData'

export type KitChoice = 'league' | 'custom'

export const KIT_PARAM = 'kit'

export function pickKit(
    league: PublicSpecKit | undefined,
    custom: PublicSpecKit | undefined,
    param: string | null,
): { kit: PublicSpecKit | undefined; choice: KitChoice; canSwitch: boolean } {
    const canSwitch = league !== undefined && custom !== undefined
    if (canSwitch && param === 'custom') return { kit: custom, choice: 'custom', canSwitch }
    return { kit: league, choice: 'league', canSwitch }
}
