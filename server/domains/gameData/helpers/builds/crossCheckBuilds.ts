import type { DatasetIssue, GameDatasetPayloads } from '../../types/datasets'
import { NO_ROLL_VALUE } from '../datasets/crossCheck'
import { formatGameHeight } from '@/shared/utils/height'

const HEIGHT_TOLERANCE = 1e-6

export const buildNameKey = (name: string) => name.trim().toLowerCase()

export function crossCheckBuilds(sets: Partial<GameDatasetPayloads>): DatasetIssue[] {
    const issues: DatasetIssue[] = []
    const { builds, buildPassives, heights, abilities, physicals, technicals, rarities } = sets
    const warnBuild = (entry: string, message: string) => issues.push({ level: 'warning', kind: 'builds', entry, message })
    const warnEffects = (entry: string, message: string) => issues.push({ level: 'warning', kind: 'buildPassives', entry, message })

    if (builds) {
        const rollable = [
            { label: 'Physical', field: 'physical' as const, entries: physicals },
            { label: 'Technical', field: 'technical' as const, entries: technicals },
        ]
        for (const { label, field, entries } of rollable) {
            if (!entries) continue
            const values = new Set(entries.filter(e => e.value !== NO_ROLL_VALUE).map(e => e.value.toLowerCase()))
            for (const build of builds) {
                for (const combo of build.combos) {
                    if (!values.has(combo[field].toLowerCase())) warnBuild(build.name, `${label} "${combo[field]}" is not a rollable ${label.toLowerCase()}`)
                }
            }
        }

        if (rarities) {
            const names = new Set(rarities.map(r => r.name.toLowerCase()))
            for (const build of builds) {
                if (!names.has(build.rarity.toLowerCase())) warnBuild(build.name, `Rarity "${build.rarity}" matches no rarity`)
            }
        }

        if (heights) {
            const listed = heights.map(h => h.value)
            const isListed = (value: number) => listed.some(h => Math.abs(h - value) < HEIGHT_TOLERANCE)
            for (const build of builds) {
                for (const combo of build.combos) {
                    for (const value of new Set([combo.minHeight, combo.maxHeight])) {
                        if (!isListed(value)) warnBuild(build.name, `Height ${value} (${formatGameHeight(value)}) is not a rollable height`)
                    }
                }
            }
        }

        const combos = builds.flatMap(build => build.combos.map(combo => ({ build: build.name, ...combo })))
        for (let i = 0; i < combos.length; i++) {
            for (let j = i + 1; j < combos.length; j++) {
                const a = combos[i]
                const b = combos[j]
                if (a.build === b.build) continue
                const samePair = a.physical.toLowerCase() === b.physical.toLowerCase() && a.technical.toLowerCase() === b.technical.toLowerCase()
                if (samePair && a.minHeight <= b.maxHeight + HEIGHT_TOLERANCE && b.minHeight <= a.maxHeight + HEIGHT_TOLERANCE) {
                    warnBuild(b.build, `A ${b.physical} / ${b.technical} roll could match both ${a.build} and ${b.build}`)
                }
            }
        }
    }

    if (buildPassives) {
        const buildNames = builds ? new Set(builds.map(b => buildNameKey(b.name))) : null
        const abilityKeys = abilities ? new Set(abilities.map(a => a.key.toLowerCase())) : null
        for (const entry of buildPassives) {
            if (buildNames && !buildNames.has(buildNameKey(entry.build))) warnEffects(entry.build, 'Has effects but no build of that name')
            if (!abilityKeys) continue
            for (const effect of entry.effects) {
                if (effect.type === 'bonus' && !abilityKeys.has(effect.name.toLowerCase())) {
                    warnEffects(entry.build, `Bonus ability "${effect.name}" is not in the ability catalog`)
                }
            }
        }
    }

    return issues
}
