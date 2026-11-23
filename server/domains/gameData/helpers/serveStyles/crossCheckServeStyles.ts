import type { DatasetIssue, GameDatasetPayloads } from '../../types/datasets'
import { styleTunables } from './styleTunable'

export function crossCheckServeStyles(sets: Partial<GameDatasetPayloads>): DatasetIssue[] {
    const issues: DatasetIssue[] = []
    const { serveStyles, serveStyleValues, specLoadouts, specLoadoutsPaid } = sets

    if (serveStyles && serveStyleValues) {
        for (const style of serveStyles) {
            const matches = styleTunables(style.name, serveStyleValues)
            if (matches.length === 0) issues.push({ level: 'error', kind: 'serveStyleValues', entry: style.name, message: 'No value for this style' })
            if (matches.length > 1) {
                issues.push({ level: 'error', kind: 'serveStyleValues', entry: style.name, message: `Matches ${matches.length} values: ${matches.map(m => m.key).join(', ')}` })
            }
        }
        for (const value of serveStyleValues) {
            if (!serveStyles.some(s => styleTunables(s.name, [value]).length > 0)) {
                issues.push({ level: 'warning', kind: 'serveStyleValues', entry: value.key, message: 'Matches no serve style' })
            }
        }
    }

    if (serveStyles) {
        const names = new Set(serveStyles.map(s => s.name))
        const loadoutSets = [
            { kind: 'specLoadouts' as const, loadouts: specLoadouts },
            { kind: 'specLoadoutsPaid' as const, loadouts: specLoadoutsPaid },
        ]
        for (const { kind, loadouts } of loadoutSets) {
            for (const loadout of loadouts ?? []) {
                for (const style of loadout.styles) {
                    if (!names.has(style.name)) issues.push({ level: 'error', kind, entry: loadout.key, message: `Unknown serve style "${style.name}"` })
                }
            }
        }
    }

    if (specLoadouts && specLoadoutsPaid) {
        const league = new Set(specLoadouts.map(l => l.key))
        for (const loadout of specLoadoutsPaid) {
            if (!league.has(loadout.key)) {
                issues.push({ level: 'warning', kind: 'specLoadoutsPaid', entry: loadout.key, message: 'No League loadout with this key, the Custom kit will not show' })
            }
        }
    }

    return issues
}
