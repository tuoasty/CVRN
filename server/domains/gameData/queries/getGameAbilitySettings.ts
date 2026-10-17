import { DBClient } from '@/shared/types/db'
import { Ok, Result } from '@/shared/types/result'
import { findAllGameAbilitySettings } from '@/server/db/gameAbilitySetting.repo'
import { DESCRIPTION_SOURCES, type DescriptionSource } from '../types/schemas'

const isSource = (value: string): value is DescriptionSource => (DESCRIPTION_SOURCES as readonly string[]).includes(value)

export async function getGameAbilitySettings(supabase: DBClient): Promise<Result<Record<string, DescriptionSource>>> {
    const rows = await findAllGameAbilitySettings(supabase)
    if (!rows.ok) return rows
    const settings: Record<string, DescriptionSource> = {}
    for (const row of rows.value) if (isSource(row.description_source)) settings[row.ability_key] = row.description_source
    return Ok(settings)
}
