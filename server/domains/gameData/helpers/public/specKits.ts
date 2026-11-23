import type { Ability, GameDatasetPayloads, ServeStyleValue, SpecStyle } from '../../types/datasets'
import type { InspectorData, PublicKitEntry, PublicKitStyle, PublicSpecKit } from '../../types/publicInformation'
import type { TermBook } from '../../terms/types'
import { capitalize, fmt } from '../../terms/format'
import { renderValue, templateFormat } from '../../terms/segments'
import { styleTunables } from '../serveStyles/styleTunable'
import { describeStyleValue } from './serveStyles'
import { createKitResolver, kitTarget, resolveKit, resolveTuning, type KitEntry, type ResolvedTune } from '../specLoadouts/resolveKit'
import { applyTunes, type InspectorContext } from './inspector'

const EFFECT_AMOUNT = /^Effects\.(\d+)\.Amount$/

function labelTune(tune: ResolvedTune, abilityByKey: Map<string, Ability>, ctx: InspectorContext): ResolvedTune {
    const match = EFFECT_AMOUNT.exec(tune.path)
    const effect = match && tune.target ? abilityByKey.get(tune.target)?.effects[Number(match[1]) - 1] : undefined
    const label = effect ? ctx.context.terms.effects.get(effect.tag)?.label : undefined
    return label ? { ...tune, label: capitalize(label) } : tune
}

function toEntry(entry: KitEntry, tunes: ResolvedTune[], inspectorFor: (key: string) => InspectorData | undefined): PublicKitEntry {
    const result: PublicKitEntry = { name: entry.name, slot: entry.slot }
    const target = kitTarget(entry)
    if (!target) return result
    result.target = target

    const hits = tunes.filter(t => t.slot === entry.slot && t.ability === entry.name)
    const base = hits.length > 0 ? inspectorFor(target) : undefined
    if (base) result.tuned = applyTunes(base, hits)
    return result
}

function toStyle(style: SpecStyle, values: ServeStyleValue[], terms: TermBook): PublicKitStyle {
    const matches = styleTunables(style.name, values)
    if (matches.length !== 1) return { name: style.name, text: '', regular: null }
    const { key, value: regularValue } = matches[0]
    const template = terms.params.get(key)?.template
    const slot = template ? templateFormat(template)?.slot : undefined
    const regular = style.value === regularValue ? null : slot ? renderValue(slot, regularValue) : fmt(regularValue)
    return { name: style.name, text: describeStyleValue(key, style.value, terms), regular }
}

export function buildSpecKits(
    payloads: Partial<GameDatasetPayloads>,
    ctx: InspectorContext,
    inspectorFor: (key: string) => InspectorData | undefined,
): Record<string, PublicSpecKit> {
    const abilities = payloads.abilities ?? []
    const abilityByKey = new Map(abilities.map(a => [a.key, a]))
    const resolve = createKitResolver(abilityByKey.keys())

    const styleValues = payloads.serveStyleValues ?? []
    const kits: Record<string, PublicSpecKit> = {}
    for (const loadout of payloads.specLoadouts ?? []) {
        const kit = resolveKit(loadout, resolve)
        const tunes = resolveTuning(loadout, kit, abilityByKey).map(t => labelTune(t, abilityByKey, ctx))
        const entries = kit.map(e => toEntry(e, tunes, inspectorFor))
        const result: PublicSpecKit = {
            cooldown: loadout.cooldown,
            active: entries.filter(e => e.slot === 'Active'),
            passive: entries.filter(e => e.slot === 'Passive'),
            styles: (loadout.styles ?? []).map(style => toStyle(style, styleValues, ctx.context.terms)),
        }
        if (loadout.lifetime !== undefined) result.lifetime = loadout.lifetime
        kits[loadout.key] = result
    }
    return kits
}
