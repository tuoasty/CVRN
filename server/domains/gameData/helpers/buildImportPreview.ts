import type { Ability, DatasetIssue, GameDatasetKind, GameDatasetPayloads, ServeStyleValue, SpecLoadout } from '../types/datasets'
import { unmappedStyleTags, unmappedTags } from '../terms/describeAbility'
import type { TermBook } from '../terms/types'
import type { GameDataPreview, IgnoredStatement, KindChoices, PendingStatement, PreviewDataset } from '../types/preview'
import { parseLuaData } from './lua/parseLuaData'
import { crossCheck } from './datasets/crossCheck'
import { diffDataset } from './datasets/diffDataset'
import { DATASET_LABELS, normalizeDataset } from './datasets/registry'
import { detectStatement } from './datasets/detectKind'
import { createKitResolver, resolveKit, resolveTuning, tuneIssues } from './specLoadouts/resolveKit'
import { buildSpecLinkPlan } from './specLoadouts/linkPlan'
import type { LinkSpec } from '../types/specLinks'

export type { KindChoice, KindChoices } from '../types/preview'

function choiceLabel(choice: KindChoices[number]): string {
    return choice === 'skip' ? 'Skip' : DATASET_LABELS[choice]
}

export interface ImportAnalysis {
    preview: GameDataPreview
    sources: Partial<Record<GameDatasetKind, string>>
}

export function buildImportPreview(text: string, stored: Partial<GameDatasetPayloads> = {}, terms?: TermBook, specs: LinkSpec[] = [], skipped: ReadonlySet<string> = new Set(), choices: KindChoices = {}): GameDataPreview {
    return analyzeImport(text, stored, terms, specs, skipped, choices).preview
}

export function analyzeImport(text: string, stored: Partial<GameDatasetPayloads> = {}, terms?: TermBook, specs: LinkSpec[] = [], skipped: ReadonlySet<string> = new Set(), choices: KindChoices = {}): ImportAnalysis {
    const parsed = parseLuaData(text)
    if (!parsed.ok) return { preview: { status: 'parse_error', error: parsed.error }, sources: {} }

    const byKind = new Map<GameDatasetKind, PreviewDataset>()
    const sources: Partial<Record<GameDatasetKind, string>> = {}
    const ignored: IgnoredStatement[] = []
    const pending: PendingStatement[] = []
    const crossIssues: DatasetIssue[] = []
    const unusedChoices = new Set(Object.keys(choices).map(Number))
    const rejectChoice = (line: number) => {
        crossIssues.push({ level: 'error', message: `Line ${line} cannot be read as ${choiceLabel(choices[line])}` })
    }

    for (const statement of parsed.value) {
        const detection = detectStatement(statement)
        const choice = choices[statement.line]
        unusedChoices.delete(statement.line)
        const ignore = () => ignored.push({ target: statement.target, line: statement.line })

        if (detection.status === 'unknown') {
            if (choice !== undefined && choice !== 'skip') rejectChoice(statement.line)
            ignore()
            continue
        }

        let kind: GameDatasetKind
        let alternatives: GameDatasetKind[] = []
        if (detection.status === 'root') {
            if (choice !== undefined) rejectChoice(statement.line)
            kind = detection.kind
        } else if (choice === 'skip') {
            ignore()
            continue
        } else if (choice !== undefined && detection.candidates.includes(choice)) {
            kind = choice
            alternatives = detection.candidates.filter(c => c !== choice)
        } else {
            if (choice !== undefined) rejectChoice(statement.line)
            if (detection.candidates.length > 1) {
                pending.push({ line: statement.line, candidates: detection.candidates })
                continue
            }
            kind = detection.candidates[0]
        }

        if (byKind.has(kind)) {
            crossIssues.push({
                level: 'error',
                kind,
                message: `${DATASET_LABELS[kind]} is assigned more than once in this paste (lines ${byKind.get(kind)!.line} and ${statement.line})`,
            })
        }
        const { payload, issues } = normalizeDataset(kind, detection.value)
        if ((kind === 'abilities' || kind === 'serveStyleValues') && terms) {
            const unmapped = kind === 'abilities' ? unmappedTags(payload as Ability[], terms) : unmappedStyleTags(payload as ServeStyleValue[], terms)
            for (const u of unmapped) {
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
            alternatives,
        } as PreviewDataset)
    }

    for (const line of unusedChoices) rejectChoice(line)

    const merged: Partial<GameDatasetPayloads> = { ...stored }
    for (const dataset of byKind.values()) {
        (merged as Record<GameDatasetKind, unknown>)[dataset.kind] = dataset.payload
    }
    crossIssues.push(...crossCheck(merged))

    const loadoutSet = byKind.get('specLoadouts')
    if (merged.abilities) {
        const abilityByKey = new Map(merged.abilities.map(a => [a.key, a]))
        const resolve = createKitResolver(abilityByKey.keys())
        for (const kind of ['specLoadouts', 'specLoadoutsPaid'] as const) {
            const set = byKind.get(kind)
            if (!set) continue
            for (const loadout of set.payload as SpecLoadout[]) {
                const tunes = resolveTuning(loadout, resolveKit(loadout, resolve), abilityByKey)
                set.issues.push(...tuneIssues(loadout, tunes).map(issue => ({ ...issue, kind })))
            }
        }
    }

    const datasets = [...byKind.values()].sort((a, b) => a.line - b.line)
    const hasError = crossIssues.some(i => i.level === 'error') || datasets.some(d => d.issues.some(i => i.level === 'error'))

    return {
        preview: {
            status: 'ok',
            datasets,
            ignored,
            pending,
            crossIssues,
            checkedKinds: Object.keys(merged) as GameDatasetKind[],
            canPublish: datasets.length > 0 && pending.length === 0 && !hasError,
            specLinks: loadoutSet ? buildSpecLinkPlan(loadoutSet.payload as SpecLoadout[], specs, skipped) : null,
            hasChanges: datasets.some(d => !d.diff?.unchanged),
        },
        sources,
    }
}
