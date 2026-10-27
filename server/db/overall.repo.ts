import { DBClient, OverallScalingInsert, OverallScalingRow, PlayerOverallRow, SeasonOverallInputRow } from '@/shared/types/db'
import { Err, Ok, Result } from '@/shared/types/result'
import { serializeError } from '@/server/utils/serializeableError'

export async function findSeasonOverallInputs(supabase: DBClient, seasonNumber: number): Promise<Result<SeasonOverallInputRow[]>> {
    const { data, error } = await supabase.rpc('get_overall_inputs', { p_season_number: seasonNumber })
    if (error) return Err(serializeError(error, 'DB_ERROR'))
    return Ok((data ?? []) as SeasonOverallInputRow[])
}

export async function findOverallScalingsBySeasonNumber(supabase: DBClient, seasonNumber: number): Promise<Result<OverallScalingRow[]>> {
    const { data, error } = await supabase
        .from('overall_scalings')
        .select('*')
        .eq('season_number', seasonNumber)
    if (error) return Err(serializeError(error, 'DB_ERROR'))
    return Ok((data ?? []) as OverallScalingRow[])
}

export async function findPlayerOverallsBySeasonNumber(supabase: DBClient, seasonNumber: number): Promise<Result<PlayerOverallRow[]>> {
    const { data, error } = await supabase
        .from('player_overalls')
        .select('*')
        .eq('season_number', seasonNumber)
    if (error) return Err(serializeError(error, 'DB_ERROR'))
    return Ok((data ?? []) as PlayerOverallRow[])
}

export async function upsertOverallScalingRows(supabase: DBClient, rows: OverallScalingInsert[]): Promise<Result<OverallScalingRow[]>> {
    const { data, error } = await supabase
        .from('overall_scalings')
        .upsert(rows, { onConflict: 'season_number,position' })
        .select('*')
    if (error) return Err(serializeError(error, error.code === '42501' ? 'FORBIDDEN' : 'DB_ERROR'))
    return Ok((data ?? []) as OverallScalingRow[])
}

export async function upsertPlayerOverall(supabase: DBClient, p: { seasonNumber: number; playerId: string; overall: number }): Promise<Result<true>> {
    const { error } = await supabase
        .from('player_overalls')
        .upsert(
            { season_number: p.seasonNumber, player_id: p.playerId, overall: p.overall, updated_at: new Date().toISOString() },
            { onConflict: 'player_id,season_number' },
        )
    if (error) return Err(serializeError(error, error.code === '42501' ? 'FORBIDDEN' : 'DB_ERROR'))
    return Ok(true)
}

export async function deletePlayerOverall(supabase: DBClient, p: { seasonNumber: number; playerId: string }): Promise<Result<true>> {
    const { error } = await supabase
        .from('player_overalls')
        .delete()
        .eq('season_number', p.seasonNumber)
        .eq('player_id', p.playerId)
    if (error) return Err(serializeError(error, error.code === '42501' ? 'FORBIDDEN' : 'DB_ERROR'))
    return Ok(true)
}
