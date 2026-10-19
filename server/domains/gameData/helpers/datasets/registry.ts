import type { LuaValue } from '../../types/luaValue'
import type { GameDatasetKind, GameDatasetPayloads, NormalizeResult } from '../../types/datasets'
import { normalizeAbilities } from './normalizeAbilities'
import { normalizeAttributes } from './normalizeAttributes'
import { normalizeRarities } from './normalizeRarities'
import { normalizeSpecLoadouts } from './normalizeSpecLoadouts'

export const DATASET_ROOTS: Record<GameDatasetKind, string> = {
    rarities: 'RollCatalog.Rarities',
    abilities: 'AbilityCatalog.Abilities',
    physicals: 'Attributes.Physicals',
    technicals: 'Attributes.Technicals',
    specLoadouts: 'SpecCatalog.Specs',
}

export const DATASET_LABELS: Record<GameDatasetKind, string> = {
    rarities: 'Rarities',
    abilities: 'Abilities',
    physicals: 'Physicals',
    technicals: 'Technicals',
    specLoadouts: 'Spec loadouts',
}

type EntryKeys = { [K in GameDatasetKind]: (entry: GameDatasetPayloads[K][number]) => string }

const ENTRY_KEYS: EntryKeys = {
    rarities: r => r.name,
    abilities: a => a.key,
    physicals: e => e.value,
    technicals: e => e.value,
    specLoadouts: l => l.key,
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
    specLoadouts: normalizeSpecLoadouts,
}

export function normalizeDataset<K extends GameDatasetKind>(kind: K, value: LuaValue): NormalizeResult<GameDatasetPayloads[K][number]> {
    return NORMALIZERS[kind](value)
}
