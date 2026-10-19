import { DBClient, GameTermRow } from '@/shared/types/db'
import { Err, Ok, Result } from '@/shared/types/result'
import { serializeError } from '@/server/utils/serializeableError'

export type GameTermReadRow = Pick<GameTermRow, 'kind' | 'tag' | 'category' | 'label' | 'unit' | 'template' | 'grants' | 'verified' | 'updated_by' | 'updated_at'>
export type GameTermWriteDto = Omit<GameTermReadRow, 'updated_at'>

const COLUMNS = 'kind, tag, category, label, unit, template, grants, verified, updated_by, updated_at'

export async function findAllGameTerms(supabase: DBClient): Promise<Result<GameTermReadRow[]>> {
    const { data, error } = await supabase
        .from('game_terms')
        .select(COLUMNS)
        .order('kind')
        .order('tag')
    if (error) return Err(serializeError(error, 'DB_ERROR'))
    return Ok((data ?? []) as GameTermReadRow[])
}

export async function findGameTerm(supabase: DBClient, kind: string, tag: string): Promise<Result<GameTermReadRow | null>> {
    const { data, error } = await supabase
        .from('game_terms')
        .select(COLUMNS)
        .eq('kind', kind)
        .eq('tag', tag)
        .maybeSingle()
    if (error) return Err(serializeError(error, 'DB_ERROR'))
    return Ok(data as GameTermReadRow | null)
}

export async function upsertGameTerm(supabase: DBClient, row: GameTermWriteDto): Promise<Result<GameTermReadRow>> {
    const { data, error } = await supabase
        .from('game_terms')
        .upsert({ ...row, updated_at: new Date().toISOString() }, { onConflict: 'kind,tag' })
        .select(COLUMNS)
        .single()
    if (error) return Err(serializeError(error, 'DB_ERROR'))
    return Ok(data as GameTermReadRow)
}

export async function updateGameTermVerified(supabase: DBClient, kind: string, tag: string, verified: boolean, userId: string): Promise<Result<GameTermReadRow>> {
    const { data, error } = await supabase
        .from('game_terms')
        .update({ verified, updated_by: userId, updated_at: new Date().toISOString() })
        .eq('kind', kind)
        .eq('tag', tag)
        .select(COLUMNS)
        .single()
    if (error) return Err(serializeError(error, 'DB_ERROR'))
    return Ok(data as GameTermReadRow)
}
