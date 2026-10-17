import { DBClient, GameTermRow } from '@/shared/types/db'
import { Err, Ok, Result } from '@/shared/types/result'
import { serializeError } from '@/server/utils/serializeableError'

export type GameTermReadRow = Pick<GameTermRow, 'kind' | 'tag' | 'category' | 'label' | 'unit' | 'template' | 'grants' | 'verified'>

export async function findAllGameTerms(supabase: DBClient): Promise<Result<GameTermReadRow[]>> {
    const { data, error } = await supabase
        .from('game_terms')
        .select('kind, tag, category, label, unit, template, grants, verified')
        .order('kind')
        .order('tag')
    if (error) return Err(serializeError(error, 'DB_ERROR'))
    return Ok((data ?? []) as GameTermReadRow[])
}
