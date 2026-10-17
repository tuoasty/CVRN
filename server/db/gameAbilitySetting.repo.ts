import { DBClient, GameAbilitySettingRow } from '@/shared/types/db'
import { Err, Ok, Result } from '@/shared/types/result'
import { serializeError } from '@/server/utils/serializeableError'

export type GameAbilitySettingReadRow = Pick<GameAbilitySettingRow, 'ability_key' | 'description_source'>

export async function findAllGameAbilitySettings(supabase: DBClient): Promise<Result<GameAbilitySettingReadRow[]>> {
    const { data, error } = await supabase
        .from('game_ability_settings')
        .select('ability_key, description_source')
    if (error) return Err(serializeError(error, 'DB_ERROR'))
    return Ok((data ?? []) as GameAbilitySettingReadRow[])
}

export async function upsertGameAbilitySetting(supabase: DBClient, row: { ability_key: string; description_source: string; updated_by: string }): Promise<Result<null>> {
    const { error } = await supabase
        .from('game_ability_settings')
        .upsert({ ...row, updated_at: new Date().toISOString() }, { onConflict: 'ability_key' })
    if (error) return Err(serializeError(error, 'DB_ERROR'))
    return Ok(null)
}
