import { DBClient } from '@/shared/types/db'
import { Ok, Result } from '@/shared/types/result'
import type { GameDataPreview } from '../types'
import { buildImportPreview } from '../helpers/buildImportPreview'
import { getStoredGameDatasets } from './getStoredGameDatasets'

export async function previewGameDataImport(supabase: DBClient, text: string): Promise<Result<GameDataPreview>> {
    const stored = await getStoredGameDatasets(supabase)
    if (!stored.ok) return stored
    return Ok(buildImportPreview(text, stored.value.payloads))
}
