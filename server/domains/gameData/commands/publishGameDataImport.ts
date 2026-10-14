import type { Json } from '@/database.types'
import { DBClient } from '@/shared/types/db'
import { Err, Ok, Result } from '@/shared/types/result'
import { upsertGameDatasets } from '@/server/db/gameDataset.repo'
import type { PublishGameDataResult, UpsertGameDatasetDto } from '../types'
import { analyzeImport } from '../helpers/buildImportPreview'
import { getStoredGameDatasets } from '../queries/getStoredGameDatasets'

export async function publishGameDataImport(supabase: DBClient, p: { text: string; userId: string }): Promise<Result<PublishGameDataResult>> {
    const stored = await getStoredGameDatasets(supabase)
    if (!stored.ok) return stored

    const { preview, sources } = analyzeImport(p.text, stored.value.payloads)
    if (preview.status === 'parse_error') {
        return Err({ message: `Line ${preview.error.line}: ${preview.error.message}`, code: 'VALIDATION_ERROR' })
    }
    if (!preview.canPublish) {
        return Err({ message: 'This paste has blocking errors. Preview it and fix them first.', code: 'VALIDATION_ERROR' })
    }

    const importedAt = new Date().toISOString()
    const rows: UpsertGameDatasetDto[] = preview.datasets
        .filter(d => !d.diff?.unchanged)
        .map(d => ({
            kind: d.kind,
            payload: d.payload as unknown as Json,
            source_text: sources[d.kind]!,
            imported_by: p.userId,
            imported_at: importedAt,
        }))

    if (rows.length > 0) {
        const written = await upsertGameDatasets(supabase, rows)
        if (!written.ok) return written
    }

    const after = await getStoredGameDatasets(supabase)
    if (!after.ok) return after
    return Ok({ published: rows.map(r => r.kind), stored: after.value.summaries })
}
