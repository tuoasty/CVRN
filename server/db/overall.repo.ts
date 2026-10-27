import { DBClient, OverallScalingInsert, OverallScalingRow, PlayerOverallRow, SeasonOverallInputRow } from '@/shared/types/db'
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

export async function upsertOverallScalingRows(supabase: DBClient, rows: OverallScalingInsert[]): Promise<Result<OverallScalingRow[]>> {
    const { data, error } = await supabase
        .from('overall_scalings')
        .upsert(rows, { onConflict: 'season_id,position' })
        .select('*')
    if (error) return Err(serializeError(error, error.code === '42501' ? 'FORBIDDEN' : 'DB_ERROR'))
    return Ok((data ?? []) as OverallScalingRow[])
}

export async function upsertPlayerOverall(supabase: DBClient, p: { seasonId: string; playerId: string; overall: number }): Promise<Result<true>> {
    const { error } = await supabase
        .from('player_overalls')
        .upsert(
            { season_id: p.seasonId, player_id: p.playerId, overall: p.overall, updated_at: new Date().toISOString() },
            { onConflict: 'player_id,season_id' },
        )
    if (error) return Err(serializeError(error, error.code === '42501' ? 'FORBIDDEN' : 'DB_ERROR'))
    return Ok(true)
}

export async function deletePlayerOverall(supabase: DBClient, p: { seasonId: string; playerId: string }): Promise<Result<true>> {
    const { error } = await supabase
        .from('player_overalls')
        .delete()
        .eq('season_id', p.seasonId)
        .eq('player_id', p.playerId)
    if (error) return Err(serializeError(error, error.code === '42501' ? 'FORBIDDEN' : 'DB_ERROR'))
    return Ok(true)
}
