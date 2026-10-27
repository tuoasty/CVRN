import type { Json } from '@/database.types'
import { DBClient, GameDatasetRow } from '@/shared/types/db'
import { Err, Ok, Result } from '@/shared/types/result'
import { serializeError } from '@/server/utils/serializeableError'
import type { SpecLinkOp, UpsertGameDatasetDto } from '@/server/domains/gameData/types'

export type GameDatasetPayloadRow = Pick<GameDatasetRow, 'kind' | 'payload' | 'imported_at'>

export async function findAllGameDatasets(supabase: DBClient): Promise<Result<GameDatasetPayloadRow[]>> {
    const { data, error } = await supabase
        .from('game_datasets')
        .select('kind, payload, imported_at')
    if (error) return Err(serializeError(error, 'DB_ERROR'))
    return Ok((data ?? []) as GameDatasetPayloadRow[])
}

function toSpecOpRow(op: SpecLinkOp): Record<string, string | number | null> {
    if (op.op === 'link') return { op: 'link', game_key: op.gameKey, spec_id: op.specId, name: op.name, height: op.height }
    if (op.op === 'skip' || op.op === 'unskip') return { op: op.op, game_key: op.gameKey }
    if (op.op === 'custom') return { op: 'custom', game_key: op.gameKey, name: op.name, height: op.height }
    return { op: 'create', game_key: op.gameKey, name: op.name, stars: op.stars, position: op.position, height: op.height }
}

export async function publishGameData(supabase: DBClient, rows: UpsertGameDatasetDto[], ops: SpecLinkOp[]): Promise<Result<null>> {
    const { error } = await supabase.rpc('publish_game_data', {
        p_datasets: rows as unknown as Json,
        p_spec_ops: ops.map(toSpecOpRow) as unknown as Json,
    })
    if (error) return Err(serializeError(error, 'DB_ERROR'))
    return Ok(null)
}
