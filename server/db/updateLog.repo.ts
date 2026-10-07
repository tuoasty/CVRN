import { DBClient, UpdateLog } from '@/shared/types/db'
import { Err, Ok, Result } from '@/shared/types/result'
import { serializeError } from '@/server/utils/serializeableError'
import { InsertUpdateLogDto, UpdateUpdateLogFields } from '@/server/domains/updateLog/types'

const UNIQUE_VIOLATION = '23505'

function versionTakenOr(error: { code?: string }) {
    if (error.code === UNIQUE_VIOLATION) {
        return Err({ message: 'That version already has an update log. Choose another.', code: 'UPDATE_LOG_VERSION_TAKEN' as const })
    }
    return Err(serializeError(error, 'DB_ERROR'))
}

export async function insertUpdateLog(supabase: DBClient, p: InsertUpdateLogDto): Promise<Result<UpdateLog>> {
    const { data, error } = await supabase
        .from('update_logs')
        .insert(p)
        .select()
        .single()
    if (error) return versionTakenOr(error)
    return Ok(data as UpdateLog)
}

export async function findAllUpdateLogs(supabase: DBClient): Promise<Result<UpdateLog[]>> {
    const { data, error } = await supabase
        .from('update_logs')
        .select('*')
        .order('released_at', { ascending: false })
        .order('created_at', { ascending: false })
    if (error) return Err(serializeError(error, 'DB_ERROR'))
    return Ok((data ?? []) as UpdateLog[])
}

export async function findUpdateLogById(supabase: DBClient, id: string): Promise<Result<UpdateLog | null>> {
    const { data, error } = await supabase
        .from('update_logs')
        .select('*')
        .eq('id', id)
        .maybeSingle()
    if (error) return Err(serializeError(error, 'DB_ERROR'))
    return Ok(data as UpdateLog | null)
}

export async function findUpdateLogVersionExists(supabase: DBClient, version: string, excludeId?: string): Promise<Result<boolean>> {
    let query = supabase
        .from('update_logs')
        .select('id', { count: 'exact', head: true })
        .eq('version', version)
    if (excludeId) query = query.neq('id', excludeId)
    const { count, error } = await query
    if (error) return Err(serializeError(error, 'DB_ERROR'))
    return Ok((count ?? 0) > 0)
}

export async function updateUpdateLogRow(supabase: DBClient, id: string, fields: UpdateUpdateLogFields): Promise<Result<UpdateLog>> {
    const { data, error } = await supabase
        .from('update_logs')
        .update({ ...fields, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
    if (error) return versionTakenOr(error)
    return Ok(data as UpdateLog)
}

export async function deleteUpdateLogById(supabase: DBClient, id: string): Promise<Result<null>> {
    const { error } = await supabase.from('update_logs').delete().eq('id', id)
    if (error) return Err(serializeError(error, 'DB_ERROR'))
    return Ok(null)
}

export async function findPublishedUpdateLogIndex(supabase: DBClient): Promise<Result<Pick<UpdateLog, 'version' | 'title' | 'released_at'>[]>> {
    const { data, error } = await supabase
        .from('update_logs')
        .select('version, title, released_at')
        .not('published_at', 'is', null)
        .order('released_at', { ascending: false })
        .order('created_at', { ascending: false })
    if (error) return Err(serializeError(error, 'DB_ERROR'))
    return Ok(data ?? [])
}

export async function findPublishedUpdateLogByVersion(supabase: DBClient, version: string): Promise<Result<UpdateLog | null>> {
    const { data, error } = await supabase
        .from('update_logs')
        .select('*')
        .eq('version', version)
        .not('published_at', 'is', null)
        .maybeSingle()
    if (error) return Err(serializeError(error, 'DB_ERROR'))
    return Ok(data as UpdateLog | null)
}
