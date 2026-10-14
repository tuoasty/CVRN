import type { Ability, DatasetIssue, GameDatasetKind, GameDatasetPayloads } from '../types/datasets'
import { unmappedTags } from '../terms/describeAbility'
import type { GameDataPreview, IgnoredStatement, PreviewDataset } from '../types/preview'
import { parseLuaData } from './lua/parseLuaData'
import { crossCheck } from './datasets/crossCheck'
import { diffDataset } from './datasets/diffDataset'
import { DATASET_ROOTS, kindForRoot, normalizeDataset } from './datasets/registry'

export interface ImportAnalysis {
    preview: GameDataPreview
    sources: Partial<Record<GameDatasetKind, string>>
}

export function buildImportPreview(text: string, stored: Partial<GameDatasetPayloads> = {}): GameDataPreview {
    return analyzeImport(text, stored).preview
}

export function analyzeImport(text: string, stored: Partial<GameDatasetPayloads> = {}): ImportAnalysis {
    const parsed = parseLuaData(text)
    if (!parsed.ok) return { preview: { status: 'parse_error', error: parsed.error }, sources: {} }

    const byKind = new Map<GameDatasetKind, PreviewDataset>()
    const sources: Partial<Record<GameDatasetKind, string>> = {}
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
        if (kind === 'abilities') {
            for (const u of unmappedTags(payload as Ability[])) {
                issues.push({
                    level: 'warning',
                    entry: u.tag,
                    message: `No wording for this ${u.kind === 'option' ? 'effect option' : u.kind} yet (used ${u.uses} time${u.uses === 1 ? '' : 's'}), shown as raw text`,
                })
            }
        }
        const before = stored[kind]
        sources[kind] = statement.source
        byKind.set(kind, {
            kind,
            root: statement.target,
            line: statement.line,
            count: payload.length,
            payload,
            issues: issues.map(issue => ({ ...issue, kind })),
            diff: before ? diffDataset(kind, before as never, payload as never) : null,
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
        preview: {
            status: 'ok',
            datasets,
            ignored,
            crossIssues,
            checkedKinds: Object.keys(merged) as GameDatasetKind[],
            canPublish: datasets.length > 0 && !hasError,
            hasChanges: datasets.some(d => !d.diff?.unchanged),
        },
        sources,
    }
}
