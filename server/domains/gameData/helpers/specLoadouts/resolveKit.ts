import type { Ability, DatasetIssue, KitSlot, SpecLoadout, SpecTune } from '../../types/datasets'
import { createVariantResolver } from '../abilityIndex/resolveVariantBase'

export type NameTier =
    | { tier: 'ability'; key: string }
    | { tier: 'variant'; base: string; modifier: string }
    | { tier: 'text' }

export type KitEntry = { name: string; slot: KitSlot } & NameTier

export type NameResolver = (name: string) => NameTier

export type KitResolver = (name: string, slot: KitSlot) => KitEntry

export function createNameResolver(abilityKeys: Iterable<string>): NameResolver {
    const keys = [...abilityKeys]
    const byLower = new Map(keys.map(k => [k.toLowerCase(), k]))
    const resolveVariant = createVariantResolver(keys)

    return name => {
        const key = byLower.get(name.trim().toLowerCase())
        if (key) return { tier: 'ability', key }
        const variant = resolveVariant(name)
        if (variant) return { tier: 'variant', base: variant.base, modifier: variant.modifier }
        return { tier: 'text' }
    }
}

export function createKitResolver(abilityKeys: Iterable<string>): KitResolver {
    const resolveName = createNameResolver(abilityKeys)
    return (name, slot) => ({ name, slot, ...resolveName(name) })
}

export function kitTarget(entry: KitEntry): string | undefined {
    if (entry.tier === 'ability') return entry.key
    if (entry.tier === 'variant') return entry.base
    return undefined
}

export function resolveKit(loadout: SpecLoadout, resolve: KitResolver): KitEntry[] {
    return [...loadout.passive.map(n => resolve(n, 'Passive')), ...loadout.active.map(n => resolve(n, 'Active'))]
}

export interface ResolvedTune extends SpecTune {
    target?: string
    before: number | null
    label: string
}

const EFFECT_AMOUNT = /^Effects\.(\d+)\.Amount$/

export function resolveTuning(loadout: SpecLoadout, kit: KitEntry[], abilityByKey: Map<string, Ability>): ResolvedTune[] {
    const resolveName = createKitResolver(abilityByKey.keys())
    return loadout.tuning.map(tune => {
        const entry = kit.find(e => e.slot === tune.slot && e.name === tune.ability) ?? resolveName(tune.ability, tune.slot)
        const target = kitTarget(entry)
        const ability = target ? abilityByKey.get(target) : undefined
        const match = EFFECT_AMOUNT.exec(tune.path)
        const effect = match && ability ? ability.effects[Number(match[1]) - 1] : undefined
        const resolved: ResolvedTune = {
            ...tune,
            before: effect ? effect.amount : null,
            label: match ? `Effect ${match[1]} amount` : tune.path,
        }
        if (target) resolved.target = target
        return resolved
    })
}

export function tuneIssues(loadout: SpecLoadout, tunes: ResolvedTune[]): DatasetIssue[] {
    const issues: DatasetIssue[] = []
    for (const tune of tunes) {
        const slotNames = tune.slot === 'Passive' ? loadout.passive : loadout.active
        if (!slotNames.includes(tune.ability)) {
            issues.push({ level: 'warning', entry: loadout.key, message: `Tunes "${tune.ability}" but it is not in the ${tune.slot} kit` })
        }
        if (tune.before === null) {
            issues.push({ level: 'warning', entry: loadout.key, message: `Tune path ${tune.path} is not supported, shown as written` })
        }
    }
    return issues
}
