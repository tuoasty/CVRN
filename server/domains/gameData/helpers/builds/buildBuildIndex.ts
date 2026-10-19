import type { Ability, Build, BuildEffect, BuildPassives } from '../../types/datasets'
import type { BuildIndexEntry, ResolvedBuildEffect } from '../../types/buildIndex'
import { createNameResolver, type NameResolver } from '../specLoadouts/resolveKit'
import { fmt, humanize } from '../../terms/format'
import { gameHeightToInches } from '@/shared/utils/height'
import { buildNameKey } from './crossCheckBuilds'

export interface BuildIndexSources {
    builds: Build[]
    passives?: BuildPassives[]
    abilities: Ability[]
}

export function buildBuildIndex({ builds, passives = [], abilities }: BuildIndexSources): BuildIndexEntry[] {
    const resolveName = createNameResolver(abilities.map(a => a.key))
    const effectsByBuild = new Map(passives.map(p => [buildNameKey(p.build), p.effects]))

    return builds.map(build => {
        const effects = (effectsByBuild.get(buildNameKey(build.name)) ?? []).map(effect => resolveEffect(effect, resolveName))
        return {
            name: build.name,
            rarity: build.rarity,
            combos: build.combos.map(combo => ({
                ...combo,
                minInches: gameHeightToInches(combo.minHeight),
                maxInches: gameHeightToInches(combo.maxHeight),
            })),
            effects,
            hasEffects: effects.length > 0,
        }
    })
}

function resolveEffect(effect: BuildEffect, resolveName: NameResolver): ResolvedBuildEffect {
    if (effect.type === 'stat') return { type: 'text', name: `${humanize(effect.field)} ${fmt(effect.value)}` }
    const resolved = resolveName(effect.name)
    if (effect.type === 'bonus') {
        return resolved.tier === 'ability' ? { type: 'bonus', name: effect.name, key: resolved.key } : { type: 'bonus', name: effect.name }
    }
    if (resolved.tier === 'ability') return { type: 'ability', name: effect.name, key: resolved.key }
    if (resolved.tier === 'variant') return { type: 'variant', name: effect.name, base: resolved.base, modifier: resolved.modifier }
    return { type: 'text', name: effect.name }
}
