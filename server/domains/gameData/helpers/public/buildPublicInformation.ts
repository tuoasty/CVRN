import type { GameDatasetPayloads } from '../../types/datasets'
import type { DescriptionSource } from '../../types/schemas'
import type { InspectorData, PublicInformation } from '../../types/publicInformation'
import type { GameTerm } from '../../terms/types'
import { createAbilityLookup } from '../../terms/describeAbility'
import { createTermBook } from '../../terms/template'
import { buildAbilityIndex } from '../abilityIndex/buildAbilityIndex'
import { buildAbilityCatalog } from './abilityCatalog'
import { buildBuildCatalog } from './buildCatalog'
import { buildHeightColumns } from './heightColumns'
import { buildInspector, type InspectorContext } from './inspector'
import { buildSpecKits } from './specKits'
import { buildServeStyles } from './serveStyles'

export interface PublicInformationInput {
    payloads: Partial<GameDatasetPayloads>
    terms: GameTerm[]
    settings: Record<string, DescriptionSource>
}

export function buildPublicInformation({ payloads, terms, settings }: PublicInformationInput): PublicInformation {
    const abilities = payloads.abilities ?? []
    const ctx: InspectorContext = { context: { terms: createTermBook(terms), lookup: createAbilityLookup(abilities) }, settings }
    const catalog = buildAbilityCatalog(payloads, ctx)

    const abilityByKey = new Map(abilities.map(a => [a.key, a]))
    const index = buildAbilityIndex({ abilities, physicals: payloads.physicals ?? [], technicals: payloads.technicals ?? [], rarities: payloads.rarities ?? [] })
    const entryByKey = new Map(index.map(e => [e.key, e]))

    const inspectors: Record<string, InspectorData> = {}
    const addInspector = (key: string) => {
        const ability = abilityByKey.get(key)
        if (ability && !inspectors[key]) inspectors[key] = buildInspector(ability, entryByKey.get(key), ctx)
    }
    const rollables = [...catalog.physical, ...catalog.technical].flatMap(g => g.abilities)
    for (const ability of rollables) addInspector(ability.key)
    for (const ability of rollables) for (const line of ability.lines) if (line.grants) addInspector(line.grants)

    const inspectorFor = (key: string) => {
        addInspector(key)
        return inspectors[key]
    }
    const kits = buildSpecKits(payloads, ctx, inspectorFor)
    const customKits = buildSpecKits({ ...payloads, specLoadouts: payloads.specLoadoutsPaid ?? [] }, ctx, inspectorFor)
    for (const kit of [...Object.values(kits), ...Object.values(customKits)]) {
        for (const entry of [...kit.active, ...kit.passive]) if (entry.target) addInspector(entry.target)
    }

    const heights = buildHeightColumns(payloads.heights ?? [])
    const builds = buildBuildCatalog(payloads, catalog, heights, key => {
        addInspector(key)
        return inspectors[key]
    })
    for (const build of builds.groups.flatMap(g => g.builds)) {
        for (const effect of build.effects) if (effect.kind !== 'text' && effect.target) addInspector(effect.target)
    }

    const serveStyles = buildServeStyles(payloads.serveStyles ?? [], payloads.serveStyleValues ?? [], ctx.context.terms)

    return { abilities: catalog, inspectors, heights, kits, customKits, builds, serveStyles }
}
