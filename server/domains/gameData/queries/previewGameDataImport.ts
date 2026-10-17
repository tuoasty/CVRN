import { DBClient } from '@/shared/types/db'
import { Ok, Result } from '@/shared/types/result'
import type { GameDataPreview } from '../types'
import { buildImportPreview } from '../helpers/buildImportPreview'
import { createTermBook } from '../terms/template'
import { getStoredGameDatasets } from './getStoredGameDatasets'
import { getGameTerms } from './getGameTerms'

export async function previewGameDataImport(supabase: DBClient, text: string): Promise<Result<GameDataPreview>> {
    const [stored, terms] = await Promise.all([getStoredGameDatasets(supabase), getGameTerms(supabase)])
    if (!stored.ok) return stored
    if (!terms.ok) return terms
    return Ok(buildImportPreview(text, stored.value.payloads, createTermBook(terms.value)))
}
