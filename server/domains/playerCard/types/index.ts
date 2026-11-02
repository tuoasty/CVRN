import type { CategoryRatings } from '@/server/domains/overall'
import type { CardLayer } from './schemas'

export interface CardTemplate {
    id: string
    groupId: string
    name: string
    minOvr: number
    width: number
    height: number
    layers: CardLayer[]
}

export interface CardTemplateSummary {
    id: string
    name: string
    rank: number
    minOvr: number
    previewUrl: string | null
}

export interface CardGroup {
    id: string
    name: string
    isLimited: boolean
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

export {
    CARD_TEXT_FIELDS,
    CARD_IMAGE_FIELDS,
    CARD_STAT_LABELS,
    CARD_STAT_FIELDS,
    CARD_STATS_COLUMNS,
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
} from './schemas'
