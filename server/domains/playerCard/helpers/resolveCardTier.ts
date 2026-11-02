import { Err, Ok, Result } from '@/shared/types/result'
import { CardGroupRow, CardTemplateRow, DBClient } from '@/shared/types/db'
import { findCardGroupById, findCardTemplates } from '@/server/db/playerCards.repo'
import { pickTierTemplate } from './toCardShapes'

export async function resolveCardTier(
    supabase: DBClient,
    p: { groupId: string; ovr: number },
): Promise<Result<{ group: CardGroupRow; tier: CardTemplateRow }>> {
    const group = await findCardGroupById(supabase, p.groupId)
    if (!group.ok) return group
    if (!group.value) return Err({ message: 'Card group not found', code: 'NOT_FOUND' })
    if (!group.value.is_active) return Err({ message: `${group.value.name} is inactive`, code: 'VALIDATION_ERROR' })

    const tiers = await findCardTemplates(supabase, p.groupId)
    if (!tiers.ok) return tiers
    const tier = pickTierTemplate(tiers.value.map(row => ({ row, minOvr: row.min_ovr })), p.ovr)?.row
    if (!tier) return Err({ message: `${group.value.name} has no tier for OVR ${p.ovr}`, code: 'NOT_FOUND' })

    return Ok({ group: group.value, tier })
}
