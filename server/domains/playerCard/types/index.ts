import type { CategoryRatings, OverallPosition } from '@/server/domains/overall'
import type { CardLayer } from './schemas'

export interface CardTemplate {
    id: string
    groupId: string
    groupSlug: string
    name: string
    tier: number
    minOvr: number
    width: number
    height: number
    layers: CardLayer[]
}

export interface CardTemplateSummary {
    id: string
    name: string
    tier: number
    minOvr: number
    width: number
    height: number
    layerCount: number
    layers: CardLayer[] | null
    previewUrl: string | null
    problem: string | null
}

export interface CardGroup {
    id: string
    slug: string
    name: string
    isLimited: boolean
    isActive: boolean
    templates: CardTemplateSummary[]
}

export interface CardData {
    username: string
    displayName: string | null
    ovr: number
    position: OverallPosition | null
    teamName: string | null
    attributes: CategoryRatings
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
    CARD_STAT_ORDERS,
    CardLayerSchema,
    CardLayersSchema,
    CardOverridesSchema,
    GeneratePlayerCardSchema,
    PlayerCardsQuerySchema,
    PreviewPlayerCardSchema,
    UpdateCardTemplateLayersSchema,
} from './schemas'
export type {
    CardLayer,
    CardArtLayer,
    CardImageLayer,
    CardTextLayer,
    CardStatField,
    CardStatOrder,
    CardOverrides,
    GeneratePlayerCardInput,
    PlayerCardsQueryInput,
    PreviewPlayerCardInput,
    UpdateCardTemplateLayersInput,
} from './schemas'
