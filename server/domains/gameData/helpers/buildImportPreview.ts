import type { DatasetIssue, GameDatasetKind, GameDatasetPayloads } from '../types/datasets'
import type { GameDataPreview, IgnoredStatement, PreviewDataset } from '../types/preview'
import { parseLuaData } from './lua/parseLuaData'
import { crossCheck } from './datasets/crossCheck'
import { DATASET_ROOTS, kindForRoot, normalizeDataset } from './datasets/registry'

export function buildImportPreview(text: string, stored: Partial<GameDatasetPayloads> = {}): GameDataPreview {
    const parsed = parseLuaData(text)
    if (!parsed.ok) return { status: 'parse_error', error: parsed.error }

    const byKind = new Map<GameDatasetKind, PreviewDataset>()
    const ignored: IgnoredStatement[] = []
    const crossIssues: DatasetIssue[] = []

    for (const statement of parsed.value) {
        const kind = kindForRoot(statement.target)
        if (!kind) {
            ignored.push({ target: statement.target, line: statement.line })
            continue
        }
        if (byKind.has(kind)) {
            crossIssues.push({
                level: 'error',
                kind,
                message: `${DATASET_ROOTS[kind]} is assigned more than once in this paste (lines ${byKind.get(kind)!.line} and ${statement.line})`,
            })
        }
        const { payload, issues } = normalizeDataset(kind, statement.value)
        byKind.set(kind, {
            kind,
            root: statement.target,
            line: statement.line,
            count: payload.length,
            payload,
            issues: issues.map(issue => ({ ...issue, kind })),
        } as PreviewDataset)
    }

    const merged: Partial<GameDatasetPayloads> = { ...stored }
    for (const dataset of byKind.values()) {
        (merged as Record<GameDatasetKind, unknown>)[dataset.kind] = dataset.payload
    }
    crossIssues.push(...crossCheck(merged))

    const datasets = [...byKind.values()].sort((a, b) => a.line - b.line)
    const hasError = crossIssues.some(i => i.level === 'error') || datasets.some(d => d.issues.some(i => i.level === 'error'))

    return {
        status: 'ok',
        datasets,
        ignored,
        crossIssues,
        checkedKinds: Object.keys(merged) as GameDatasetKind[],
        canPublish: datasets.length > 0 && !hasError,
    }
}
