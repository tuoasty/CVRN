import { DBClient } from '@/shared/types/db'
import { Err, Ok, Result } from '@/shared/types/result'
import { serializeError } from '@/server/utils/serializeableError'

export async function findSkippedSpecKeys(supabase: DBClient): Promise<Result<string[]>> {
    const { data, error } = await supabase.from('game_spec_skips').select('game_key')
    if (error) return Err(serializeError(error, 'DB_ERROR'))
    return Ok((data ?? []).map(row => row.game_key))
}
