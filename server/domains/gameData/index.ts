export { previewGameDataImport } from './queries/previewGameDataImport'
export { getStoredGameDatasets, getGameDatasetPayloads } from './queries/getStoredGameDatasets'
export { getGameTerms } from './queries/getGameTerms'
export { publishGameDataImport } from './commands/publishGameDataImport'
export { saveGameTerm } from './commands/saveGameTerm'
export { setGameTermVerified } from './commands/setGameTermVerified'
export { setAbilityDescriptionSource } from './commands/setAbilityDescriptionSource'
export { getGameAbilitySettings } from './queries/getGameAbilitySettings'
export { collectTermUsage, termId, unhandledTerms, isTermHandled } from './terms/termUsage'
export type { TermUsage } from './terms/termUsage'
export { previewTermChange, validateTermDraft, normalizeTermDraft, lineNeedsAttention, unseenValue, withDraft } from './terms/termEdit'
export type { TermChange } from './terms/termEdit'
export { parseLuaData } from './helpers/lua/parseLuaData'
export { DATASET_ROOTS, DATASET_LABELS } from './helpers/datasets/registry'
export { rarityForWeight } from './helpers/datasets/rarityForWeight'
export { buildAbilityIndex } from './helpers/abilityIndex/buildAbilityIndex'
export { createVariantResolver } from './helpers/abilityIndex/resolveVariantBase'
export type { VariantResolver } from './helpers/abilityIndex/resolveVariantBase'
export { describeAbility, describeEffectMain, describeOption, createAbilityLookup, unmappedTags, SKIPPED_OPTIONS } from './terms/describeAbility'
export { resolveDescriptionSource } from './terms/descriptionSource'
export type { ResolvedDescriptionSource } from './terms/descriptionSource'
export type { OptionWording } from './terms/describeAbility'
export type { AbilityLookup, DescribeContext } from './terms/describeAbility'
export { createTermBook, termMap, renderTemplate, unknownPlaceholders, TEMPLATE_PLACEHOLDERS, EMPTY_TERM_BOOK } from './terms/template'
export type { AbilityBullet, TermCategory, TermKind, GameTerm, TermBook } from './terms/types'
export { TERM_CATEGORIES, TERM_KINDS } from './terms/types'

export type {
    LuaValue,
    LuaStatement,
    LuaParseError,
    GameDatasetKind,
    ScalarValue,
    PlainValue,
    Rarity,
    EffectOp,
    AbilityEffect,
    AbilityActive,
    AbilityToggle,
    Ability,
    AttributeEntry,
    GameDatasetPayloads,
    DatasetIssue,
    DatasetDiff,
    StoredDatasetSummary,
    PreviewDataset,
    PublishGameDataResult,
    StoredGameDatasets,
    IgnoredStatement,
    GameDataPreview,
    GameDataTextInput,
    DescriptionSource,
    SaveGameTermInput,
    SetGameTermVerifiedInput,
    SetAbilityDescriptionSourceInput,
    AbilityAvailability,
    AbilityGrant,
    AbilityIndexEntry,
    VariantMatch,
} from './types'

export { GAME_DATASET_KINDS, GameDataTextSchema, GAME_DATA_TEXT_MAX, DESCRIPTION_SOURCES, SaveGameTermSchema, SetGameTermVerifiedSchema, SetAbilityDescriptionSourceSchema } from './types'
