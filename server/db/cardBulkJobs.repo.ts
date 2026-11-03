import { CardBulkJobInsert, CardBulkJobRow, CardBulkJobUpdate, DBClient } from '@/shared/types/db'
import { Err, Ok, Result } from '@/shared/types/result'
import { serializeError } from '@/server/utils/serializeableError'

export async function insertCardBulkJob(client: DBClient, row: CardBulkJobInsert): Promise<Result<CardBulkJobRow>> {
    const { data, error } = await client.from('card_bulk_jobs').insert(row).select('*').single()
    if (error) {
        if (error.code === '23505') return Err({ message: 'A bulk generation is already running', code: 'CONFLICT' })
        return Err(serializeError(error, 'DB_ERROR'))
    }
    return Ok(data as CardBulkJobRow)
}

export async function findRunningCardBulkJob(client: DBClient): Promise<Result<CardBulkJobRow | null>> {
    const { data, error } = await client.from('card_bulk_jobs').select('*').eq('status', 'running').maybeSingle()
    if (error) return Err(serializeError(error, 'DB_ERROR'))
    return Ok(data as CardBulkJobRow | null)
}

export async function findLatestCardBulkJob(client: DBClient): Promise<Result<CardBulkJobRow | null>> {
    const { data, error } = await client
        .from('card_bulk_jobs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    if (error) return Err(serializeError(error, 'DB_ERROR'))
    return Ok(data as CardBulkJobRow | null)
}

export async function findCardBulkJobById(client: DBClient, jobId: string): Promise<Result<CardBulkJobRow | null>> {
    const { data, error } = await client.from('card_bulk_jobs').select('*').eq('id', jobId).maybeSingle()
    if (error) return Err(serializeError(error, 'DB_ERROR'))
    return Ok(data as CardBulkJobRow | null)
}

export async function updateCardBulkJob(client: DBClient, jobId: string, patch: CardBulkJobUpdate): Promise<Result<null>> {
    const { error } = await client.from('card_bulk_jobs').update(patch).eq('id', jobId)
    if (error) return Err(serializeError(error, 'DB_ERROR'))
    return Ok(null)
}

export async function requestCardBulkStop(client: DBClient, jobId: string): Promise<Result<null>> {
    const { error } = await client
        .from('card_bulk_jobs')
        .update({ stop_requested: true })
        .eq('id', jobId)
        .eq('status', 'running')
    if (error) return Err(serializeError(error, 'DB_ERROR'))
    return Ok(null)
}

export async function expireStaleCardBulkJobs(client: DBClient, cutoffIso: string, nowIso: string): Promise<Result<null>> {
    const { error } = await client
        .from('card_bulk_jobs')
        .update({ status: 'interrupted', finished_at: nowIso })
        .eq('status', 'running')
        .lt('heartbeat_at', cutoffIso)
    if (error) return Err(serializeError(error, 'DB_ERROR'))
    return Ok(null)
}
