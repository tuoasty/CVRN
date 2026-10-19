export { previewGameDataImport } from './queries/previewGameDataImport'
export { getStoredGameDatasets, getGameDatasetPayloads } from './queries/getStoredGameDatasets'
export { getGameTerms } from './queries/getGameTerms'
export { publishGameDataImport } from './commands/publishGameDataImport'
export { saveGameTerm } from './commands/saveGameTerm'
export { setGameTermVerified } from './commands/setGameTermVerified'
export { setAbilityDescriptionSource } from './commands/setAbilityDescriptionSource'
export { getGameAbilitySettings } from './queries/getGameAbilitySettings'
export { getPublicInformation } from './queries/getPublicInformation'
export { findAbility } from './helpers/public/abilityCatalog'
export { abilityHref } from './helpers/public/inspector'
export { toSlug } from './helpers/public/slug'
export type { PublicInformation, PublicAbility, PublicAbilityKind, PublicAbilityCatalog, PublicAbilityLine, RarityGroup, AbilityMarker, InspectorData, TunedInspector, SheetRow, HeightColumn, HeightRow, PublicKitEntry, PublicSpecKit } from './types/publicInformation'
export { collectTermUsage, termId, unhandledTerms, isTermHandled } from './terms/termUsage'
export type { TermUsage } from './terms/termUsage'
export { previewTermChange, validateTermDraft, normalizeTermDraft, lineNeedsAttention, unseenValue, withDraft } from './terms/termEdit'
export type { TermChange } from './terms/termEdit'
export { parseLuaData } from './helpers/lua/parseLuaData'
export { DATASET_ROOTS, DATASET_LABELS } from './helpers/datasets/registry'
export { rarityForWeight } from './helpers/datasets/rarityForWeight'
export { buildAbilityIndex } from './helpers/abilityIndex/buildAbilityIndex'
export { buildSpecLinkPlan, planSpecOps } from './helpers/specLoadouts/linkPlan'
export { normalizeSpecName, nameDistance } from './helpers/specLoadouts/nameDistance'
export { createKitResolver, resolveKit, resolveTuning, tuneIssues, kitTarget } from './helpers/specLoadouts/resolveKit'
export type { KitEntry, KitResolver, ResolvedTune } from './helpers/specLoadouts/resolveKit'
export { createVariantResolver } from './helpers/abilityIndex/resolveVariantBase'
export type { VariantResolver } from './helpers/abilityIndex/resolveVariantBase'
export { describeAbility, describeEffectMain, describeOption, createAbilityLookup, unmappedTags, SKIPPED_OPTIONS } from './terms/describeAbility'
export { resolveDescriptionSource } from './terms/descriptionSource'
export { parseTemplate, joinSegments, materializeEffectTemplate, effectTermFields, editableTemplate, VERB_SLOTS, VALUE_SLOTS } from './terms/segments'
export type { TemplateSegment } from './terms/segments'
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
    KitSlot,
    SpecTune,
    SpecLoadout,
    LinkSpec,
    SpecCandidate,
    SpecLinkItem,
    SpecLinkPlan,
    SpecStars,
    SpecLinkDecision,
    SpecLinkOp,
    HeightChange,
    SpecOpsPlan,
    PublishGameDataInput,
} from './types'

export { GAME_DATASET_KINDS, SPEC_STARS, PublishGameDataSchema, SpecLinkDecisionSchema, GameDataTextSchema, GAME_DATA_TEXT_MAX, DESCRIPTION_SOURCES, SaveGameTermSchema, SetGameTermVerifiedSchema, SetAbilityDescriptionSourceSchema } from './types'
