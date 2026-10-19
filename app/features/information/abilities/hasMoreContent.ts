import type { PublicAbility } from '@/server/domains/gameData'

export function hasMoreContent(ability: PublicAbility): boolean {
    if (ability.source === 'original') return false
    if (ability.lines.some(line => line.grants)) return true
    return ability.lines.length > 1 || (ability.lines.length === 1 && ability.lines[0].text !== ability.summary)
}
