import { DBClient } from '@/shared/types/db'
import { Result } from '@/shared/types/result'
import { upsertGameAbilitySetting } from '@/server/db/gameAbilitySetting.repo'
import type { SetAbilityDescriptionSourceInput } from '../types/schemas'

export async function setAbilityDescriptionSource(supabase: DBClient, p: { input: SetAbilityDescriptionSourceInput; userId: string }): Promise<Result<null>> {
    return upsertGameAbilitySetting(supabase, { ability_key: p.input.abilityKey, description_source: p.input.source, updated_by: p.userId })
}
