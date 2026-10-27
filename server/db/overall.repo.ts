import { DBClient, OverallScalingRow, PlayerOverallRow, SeasonOverallInputRow } from '@/shared/types/db'
import { Err, Ok, Result } from '@/shared/types/result'
import { serializeError } from '@/server/utils/serializeableError'

export async function findSeasonOverallInputs(supabase: DBClient, seasonId: string): Promise<Result<SeasonOverallInputRow[]>> {
    const { data, error } = await supabase.rpc('get_season_overall_inputs', { p_season_id: seasonId })
    if (error) return Err(serializeError(error, 'DB_ERROR'))
    return Ok((data ?? []) as SeasonOverallInputRow[])
}

export async function findOverallScalingsBySeason(supabase: DBClient, seasonId: string): Promise<Result<OverallScalingRow[]>> {
    const { data, error } = await supabase
        .from('overall_scalings')
        .select('*')
        .eq('season_id', seasonId)
    if (error) return Err(serializeError(error, 'DB_ERROR'))
    return Ok((data ?? []) as OverallScalingRow[])
}

export async function findPlayerOverallsBySeason(supabase: DBClient, seasonId: string): Promise<Result<PlayerOverallRow[]>> {
    const { data, error } = await supabase
        .from('player_overalls')
        .select('*')
        .eq('season_id', seasonId)
    if (error) return Err(serializeError(error, 'DB_ERROR'))
    return Ok((data ?? []) as PlayerOverallRow[])
}
