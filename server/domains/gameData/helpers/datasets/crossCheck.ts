import type { DatasetIssue, GameDatasetPayloads } from '../../types/datasets'
import { crossCheckBuilds } from '../builds/crossCheckBuilds'
import { crossCheckServeStyles } from '../serveStyles/crossCheckServeStyles'

export const NO_ROLL_VALUE = 'None'

export function crossCheck(sets: Partial<GameDatasetPayloads>): DatasetIssue[] {
    const issues: DatasetIssue[] = []
    const { abilities, rarities, physicals, technicals } = sets
    const lists = [
        { kind: 'physicals' as const, entries: physicals },
        { kind: 'technicals' as const, entries: technicals },
    ]

    if (abilities) {
        const keys = new Set(abilities.map(a => a.key))
        for (const { kind, entries } of lists) {
            for (const entry of entries ?? []) {
                if (entry.value !== NO_ROLL_VALUE && !keys.has(entry.value)) {
                    issues.push({ level: 'warning', kind, entry: entry.value, message: 'Rollable but missing from the ability catalog' })
                }
            }
        }
    }

    if (physicals && technicals) {
        const physicalValues = new Set(physicals.map(p => p.value))
        for (const entry of technicals) {
            if (entry.value !== NO_ROLL_VALUE && physicalValues.has(entry.value)) {
                issues.push({ level: 'warning', kind: 'technicals', entry: entry.value, message: 'Listed as both a Physical and a Technical' })
            }
        }
    }

    if (rarities) {
        const weights = new Set(rarities.map(r => r.weight))
        for (const { kind, entries } of lists) {
            for (const entry of entries ?? []) {
                if (!weights.has(entry.weight)) {
                    issues.push({ level: 'warning', kind, entry: entry.value, message: `Weight ${entry.weight} matches no rarity` })
                }
            }
        }
    }

    issues.push(...crossCheckBuilds(sets))
    issues.push(...crossCheckServeStyles(sets))

    return issues
}
