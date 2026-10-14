import { Ok, Result } from '@/shared/types/result'
import type { GameDataPreview } from '../types'
import { buildImportPreview } from '../helpers/buildImportPreview'

export async function previewGameDataImport(text: string): Promise<Result<GameDataPreview>> {
    return Ok(buildImportPreview(text))
}
