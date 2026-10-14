import { DBClient, GameDatasetRow } from '@/shared/types/db'
import { Err, Ok, Result } from '@/shared/types/result'
import { serializeError } from '@/server/utils/serializeableError'
import type { UpsertGameDatasetDto } from '@/server/domains/gameData/types'

export type GameDatasetPayloadRow = Pick<GameDatasetRow, 'kind' | 'payload' | 'imported_at'>

export async function findAllGameDatasets(supabase: DBClient): Promise<Result<GameDatasetPayloadRow[]>> {
    const { data, error } = await supabase
        .from('game_datasets')
        .select('kind, payload, imported_at')
    if (error) return Err(serializeError(error, 'DB_ERROR'))
    return Ok((data ?? []) as GameDatasetPayloadRow[])
}

export async function upsertGameDatasets(supabase: DBClient, rows: UpsertGameDatasetDto[]): Promise<Result<null>> {
    const { error } = await supabase
        .from('game_datasets')
        .upsert(rows, { onConflict: 'kind' })
    if (error) return Err(serializeError(error, 'DB_ERROR'))
    return Ok(null)
}
