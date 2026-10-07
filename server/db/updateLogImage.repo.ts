import { DBClient, UpdateLogImage } from '@/shared/types/db'
import { Err, Ok, Result } from '@/shared/types/result'
import { serializeError } from '@/server/utils/serializeableError'

const UNIQUE_VIOLATION = '23505'

function nameTakenOr(error: { code?: string }) {
    if (error.code === UNIQUE_VIOLATION) {
        return Err({ message: 'Another image in this log already uses that name.', code: 'UPDATE_LOG_IMAGE_NAME_TAKEN' as const })
    }
    return Err(serializeError(error, 'DB_ERROR'))
}

export async function findUpdateLogImagesByLogId(supabase: DBClient, updateLogId: string): Promise<Result<UpdateLogImage[]>> {
    const { data, error } = await supabase
        .from('update_log_images')
        .select('*')
        .eq('update_log_id', updateLogId)
        .order('created_at', { ascending: true })
    if (error) return Err(serializeError(error, 'DB_ERROR'))
    return Ok((data ?? []) as UpdateLogImage[])
}

export async function insertUpdateLogImage(supabase: DBClient, p: {
    id: string
    update_log_id: string
    handle: string
    storage_path: string
    url: string
    caption: string | null
}): Promise<Result<UpdateLogImage>> {
    const { data, error } = await supabase
        .from('update_log_images')
        .insert(p)
        .select()
        .single()
    if (error) return nameTakenOr(error)
    return Ok(data as UpdateLogImage)
}

export async function updateUpdateLogImageRow(supabase: DBClient, updateLogId: string, id: string, fields: { handle?: string; caption?: string | null }): Promise<Result<null>> {
    const { error } = await supabase
        .from('update_log_images')
        .update(fields)
        .eq('update_log_id', updateLogId)
        .eq('id', id)
    if (error) return nameTakenOr(error)
    return Ok(null)
}

export async function deleteUpdateLogImagesByIds(supabase: DBClient, updateLogId: string, ids: string[]): Promise<Result<string[]>> {
    if (ids.length === 0) return Ok([])
    const { data, error } = await supabase
        .from('update_log_images')
        .delete()
        .eq('update_log_id', updateLogId)
        .in('id', ids)
        .select('storage_path')
    if (error) return Err(serializeError(error, 'DB_ERROR'))
    return Ok((data ?? []).map(row => row.storage_path))
}
