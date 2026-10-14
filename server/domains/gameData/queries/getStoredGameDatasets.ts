import { DBClient } from '@/shared/types/db'
import { Ok, Result } from '@/shared/types/result'
import { findAllGameDatasets } from '@/server/db/gameDataset.repo'
import { GAME_DATASET_KINDS, type GameDatasetKind, type GameDatasetPayloads, type StoredDatasetSummary, type StoredGameDatasets } from '../types'

const isKind = (kind: string): kind is GameDatasetKind => (GAME_DATASET_KINDS as readonly string[]).includes(kind)

export async function getStoredGameDatasets(supabase: DBClient): Promise<Result<StoredGameDatasets>> {
    const rows = await findAllGameDatasets(supabase)
    if (!rows.ok) return rows

    const payloads: Partial<GameDatasetPayloads> = {}
    const summaries: StoredDatasetSummary[] = []
    for (const row of rows.value) {
        if (!isKind(row.kind) || !Array.isArray(row.payload)) continue
        (payloads as Record<GameDatasetKind, unknown>)[row.kind] = row.payload
        summaries.push({ kind: row.kind, count: row.payload.length, importedAt: row.imported_at })
    }
    summaries.sort((a, b) => GAME_DATASET_KINDS.indexOf(a.kind) - GAME_DATASET_KINDS.indexOf(b.kind))
    return Ok({ payloads, summaries })
}

export async function getGameDatasetPayloads(supabase: DBClient): Promise<Result<Partial<GameDatasetPayloads>>> {
    const stored = await getStoredGameDatasets(supabase)
    if (!stored.ok) return stored
    return Ok(stored.value.payloads)
}
