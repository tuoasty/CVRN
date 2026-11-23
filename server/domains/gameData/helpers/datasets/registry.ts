import type { LuaValue } from '../../types/luaValue'
import type { GameDatasetKind, GameDatasetPayloads, NormalizeResult } from '../../types/datasets'
import { normalizeAbilities } from './normalizeAbilities'
import { normalizeAttributes } from './normalizeAttributes'
import { normalizeBuildPassives } from './normalizeBuildPassives'
import { normalizeBuilds } from './normalizeBuilds'
import { normalizeHeights } from './normalizeHeights'
import { normalizeRarities } from './normalizeRarities'
import { normalizeServeStyles } from './normalizeServeStyles'
import { normalizeServeStyleValues } from './normalizeServeStyleValues'
import { normalizeSpecLoadouts } from './normalizeSpecLoadouts'

export const DATASET_ROOTS: Partial<Record<GameDatasetKind, string>> = {
    rarities: 'RollCatalog.Rarities',
    abilities: 'AbilityCatalog.Abilities',
    physicals: 'Attributes.Physicals',
    technicals: 'Attributes.Technicals',
    heights: 'Rerolls.Heights',
    builds: 'Builds.Table',
    buildPassives: 'BuildPassives.ByName',
    specLoadouts: 'SpecCatalog.Specs',
    serveStyles: 'ServeStyle.Styles',
}

export const DATASET_LABELS: Record<GameDatasetKind, string> = {
    rarities: 'Rarities',
    abilities: 'Abilities',
    physicals: 'Physicals',
    technicals: 'Technicals',
    heights: 'Heights',
    builds: 'Builds',
    buildPassives: 'Build effects',
    specLoadouts: 'Spec loadouts',
    serveStyles: 'Serve styles',
    serveStyleValues: 'Serve style values',
    specLoadoutsPaid: 'Spec loadouts (Custom)',
}

type EntryKeys = { [K in GameDatasetKind]: (entry: GameDatasetPayloads[K][number]) => string }

const ENTRY_KEYS: EntryKeys = {
    rarities: r => r.name,
    abilities: a => a.key,
    physicals: e => e.value,
    technicals: e => e.value,
    heights: h => String(h.value),
    builds: b => b.name,
    buildPassives: p => p.build,
    specLoadouts: l => l.key,
    serveStyles: s => s.name,
    serveStyleValues: v => v.key,
    specLoadoutsPaid: l => l.key,
}

export function entryKey<K extends GameDatasetKind>(kind: K, entry: GameDatasetPayloads[K][number]): string {
    return ENTRY_KEYS[kind](entry)
}

const KIND_BY_ROOT = new Map(
    (Object.entries(DATASET_ROOTS) as [GameDatasetKind, string][]).map(([kind, root]) => [root, kind]),
)

export function kindForRoot(target: string): GameDatasetKind | undefined {
    return KIND_BY_ROOT.get(target)
}

type Normalizers = { [K in GameDatasetKind]: (value: LuaValue) => NormalizeResult<GameDatasetPayloads[K][number]> }

const NORMALIZERS: Normalizers = {
    rarities: normalizeRarities,
    abilities: normalizeAbilities,
    physicals: normalizeAttributes,
    technicals: normalizeAttributes,
    heights: normalizeHeights,
    builds: normalizeBuilds,
    buildPassives: normalizeBuildPassives,
    specLoadouts: normalizeSpecLoadouts,
    serveStyles: normalizeServeStyles,
    serveStyleValues: normalizeServeStyleValues,
    specLoadoutsPaid: normalizeSpecLoadouts,
}

export function normalizeDataset<K extends GameDatasetKind>(kind: K, value: LuaValue): NormalizeResult<GameDatasetPayloads[K][number]> {
    return NORMALIZERS[kind](value)
}
