import type { CategoryRatings } from '@/server/domains/overall'
import type { CardLayer, RigPlacement } from './schemas'

export interface CardTemplate {
    id: string
    groupId: string
    name: string
    minOvr: number
    width: number
    height: number
    layers: CardLayer[]
}

export interface CardArtFile {
    name: string
    url: string
    size: number
}

export interface CardTemplateSummary {
    id: string
    name: string
    rank: number
    minOvr: number
    previewUrl: string | null
    art: CardArtFile[]
}

export interface CardGroup {
    id: string
    name: string
    isActive: boolean
    sortOrder: number
    width: number
    height: number
    layers: CardLayer[] | null
    layersProblem: string | null
    problem: string | null
    templates: CardTemplateSummary[]
}

export interface CardData {
    username: string
    displayName: string | null
    ovr: number
    position: string | null
    teamName: string | null
    season: string
    attributes: CategoryRatings
}

export interface CardSubject {
    playerId: string | null
    robloxUserId: string
    username: string
    displayName: string | null
    avatarUrl: string | null
    regionCode: string | null
    teamId: string | null
    teamName: string | null
    teamLogoUrl: string | null
}

export interface PlayerCard {
    playerId: string
    seasonNumber: number
    groupId: string
    templateId: string
    ovr: number
    attributes: CategoryRatings
    position: string | null
    teamId: string | null
    imageUrl: string
    generatedAt: string
}

export interface PlayerCardRig {
    playerId: string
    seasonNumber: number
    groupId: string
    imageUrl: string
    width: number
    height: number
    uploadedAt: string
    placement: RigPlacement | null
}

export interface CardAttributes {
    playerId: string
    seasonNumber: number
    ovr: number
    scoring: number
    spiking: number
    setting: number
    blocking: number
    receiving: number
    serving: number
}

export interface PublicPlayerCard {
    seasonNumber: number
    groupId: string
    groupName: string
    ovr: number
    teamName: string | null
    imageUrl: string
    width: number
    height: number
}

export type CardBulkMode = 'missing' | 'all'
export type CardBulkJobStatus = 'running' | 'completed' | 'stopped' | 'interrupted'

export interface CardBulkFailure {
    playerId: string
    username: string
    message: string
}

export interface CardBulkJob {
    id: string
    seasonNumber: number
    regionCode: string
    groupId: string
    mode: CardBulkMode
    status: CardBulkJobStatus
    stopRequested: boolean
    stopReason: string | null
    total: number
    done: number
    failed: number
    failures: CardBulkFailure[]
    currentUsername: string | null
    startedAt: string
    finishedAt: string | null
}

export {
    CARD_TEXT_FIELDS,
    CARD_IMAGE_FIELDS,
    CARD_STAT_LABELS,
    CARD_STAT_FIELDS,
    CARD_STATS_COLUMNS,
    CARD_ART_MAX_BYTES,
    CARD_ART_MAX_PIXELS,
    CARD_ART_FILE_NAME,
    hasPinnedArt,
    DeletePlayerCardSchema,
    UploadCardArtSchema,
    CardLayerSchema,
    CardLayersSchema,
    CardOverridesSchema,
    CustomCardValuesSchema,
    GenerateCustomPlayerCardSchema,
    PreviewCustomPlayerCardSchema,
    CardGroupIdSchema,
    CardTemplateIdSchema,
    CreateCardGroupSchema,
    CreateCardTemplateSchema,
    UpdateCardGroupSchema,
    UpdateCardTemplateSchema,
    GeneratePlayerCardSchema,
    PlayerCardsQuerySchema,
    PreviewPlayerCardSchema,
    UpdateCardGroupLayersSchema,
    StartCardBulkSchema,
    CardBulkJobIdSchema,
    CardPlayerIdsSchema,
    UploadPlayerCardGfxSchema,
    PlayerCardRigKeySchema,
    UploadPlayerCardRigSchema,
    RigPlacementSchema,
    UpdatePlayerCardRigPlacementSchema,
} from './schemas'
export type {
    CardLayer,
    CardArtLayer,
    CardImageLayer,
    CardTextLayer,
    CardStatField,
    CardStatsLayer,
    CardOverrides,
    CustomCardPlayer,
    CustomCardValues,
    GenerateCustomPlayerCardInput,
    PreviewCustomPlayerCardInput,
    CreateCardGroupInput,
    CreateCardTemplateInput,
    UpdateCardGroupInput,
    UpdateCardTemplateInput,
    GeneratePlayerCardInput,
    PlayerCardsQueryInput,
    PreviewPlayerCardInput,
    UpdateCardGroupLayersInput,
    UploadCardArtInput,
    DeletePlayerCardInput,
    StartCardBulkInput,
    CardPlayerIdsInput,
    UploadPlayerCardGfxInput,
    PlayerCardRigKey,
    UploadPlayerCardRigInput,
    RigPlacement,
    UpdatePlayerCardRigPlacementInput,
} from './schemas'
