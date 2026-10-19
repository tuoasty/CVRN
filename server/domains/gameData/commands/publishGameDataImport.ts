import type { Json } from '@/database.types'
import { DBClient } from '@/shared/types/db'
import { Err, Ok, Result } from '@/shared/types/result'
import { publishGameData } from '@/server/db/gameDataset.repo'
import { getSpecsAllRegions } from '@/server/domains/spec/queries/getSpecs'
import type { PublishGameDataResult, SpecLinkDecision, SpecLinkOp, UpsertGameDatasetDto } from '../types'
import { analyzeImport } from '../helpers/buildImportPreview'
import { planSpecOps } from '../helpers/specLoadouts/linkPlan'
import { getStoredGameDatasets } from '../queries/getStoredGameDatasets'
import { getLinkSpecs, getSkippedSpecKeys } from '../queries/getLinkSpecs'

export async function publishGameDataImport(
    supabase: DBClient,
    p: { text: string; specLinks: SpecLinkDecision[]; userId: string },
): Promise<Result<PublishGameDataResult>> {
    const [stored, specs, skipped] = await Promise.all([getStoredGameDatasets(supabase), getLinkSpecs(supabase), getSkippedSpecKeys(supabase)])
    if (!stored.ok) return stored
    if (!specs.ok) return specs
    if (!skipped.ok) return skipped

    const { preview, sources } = analyzeImport(p.text, stored.value.payloads, undefined, specs.value, skipped.value)
    if (preview.status === 'parse_error') {
        return Err({ message: `Line ${preview.error.line}: ${preview.error.message}`, code: 'VALIDATION_ERROR' })
    }
    if (!preview.canPublish) {
        return Err({ message: 'This paste has blocking errors. Preview it and fix them first.', code: 'VALIDATION_ERROR' })
    }

    let ops: SpecLinkOp[] = []
    if (preview.specLinks) {
        const planned = planSpecOps(preview.specLinks, p.specLinks, specs.value)
        if (!planned.ok) return Err({ message: planned.error.join('. '), code: 'VALIDATION_ERROR' })
        if (planned.value.undecided.length > 0) {
            return Err({ message: `Decide every spec first: ${planned.value.undecided.join(', ')}`, code: 'VALIDATION_ERROR' })
        }
        ops = planned.value.ops
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

    if (rows.length > 0 || ops.length > 0) {
        const written = await publishGameData(supabase, rows, ops)
        if (!written.ok) return written
    }

    const [after, fresh, skips] = await Promise.all([getStoredGameDatasets(supabase), getSpecsAllRegions(supabase), getSkippedSpecKeys(supabase)])
    if (!after.ok) return after
    if (!fresh.ok) return fresh
    if (!skips.ok) return skips
    return Ok({ published: rows.map(r => r.kind), stored: after.value, specOps: ops.length, specs: fresh.value, skipped: [...skips.value] })
}
