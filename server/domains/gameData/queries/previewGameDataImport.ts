import { DBClient } from '@/shared/types/db'
import { Ok, Result } from '@/shared/types/result'
import type { GameDataPreview, KindChoices } from '../types'
import { buildImportPreview } from '../helpers/buildImportPreview'
import { createTermBook } from '../terms/template'
import { getStoredGameDatasets } from './getStoredGameDatasets'
import { getGameTerms } from './getGameTerms'
import { getLinkSpecs, getSkippedSpecKeys } from './getLinkSpecs'

export async function previewGameDataImport(supabase: DBClient, text: string, choices: KindChoices = {}): Promise<Result<GameDataPreview>> {
    const [stored, terms, specs, skipped] = await Promise.all([getStoredGameDatasets(supabase), getGameTerms(supabase), getLinkSpecs(supabase), getSkippedSpecKeys(supabase)])
    if (!stored.ok) return stored
    if (!terms.ok) return terms
    if (!specs.ok) return specs
    if (!skipped.ok) return skipped
    return Ok(buildImportPreview(text, stored.value.payloads, createTermBook(terms.value), specs.value, skipped.value, choices))
}
