import { z } from "zod"

export const CARD_TEXT_FIELDS = ['username', 'displayName', 'ovr', 'position', 'teamName', 'season', 'custom'] as const

export const CARD_STAT_FIELDS = ['scoring', 'spiking', 'blocking', 'setting', 'receiving', 'serving'] as const
export type CardStatField = typeof CARD_STAT_FIELDS[number]

export const CARD_STATS_COLUMNS: CardStatField[][] = [
    ['scoring', 'spiking', 'blocking'],
    ['setting', 'receiving', 'serving'],
]

export const CARD_IMAGE_FIELDS = ['headshot', 'teamLogo'] as const

export const CARD_STAT_LABELS = {
    scoring: 'SCR',
    spiking: 'SPK',
    setting: 'SET',
    blocking: 'BLK',
    receiving: 'REC',
    serving: 'SRV',
} as const

const CARD_POSITIONS = ['OUT', 'OPP', 'MID', 'SET', 'LIB'] as const

const Box = {
    x: z.number(),
    y: z.number(),
    w: z.number().positive(),
    h: z.number().positive(),
}

export const CARD_ART_MAX_BYTES = Math.floor(2.9 * 1024 * 1024)
export const CARD_ART_MAX_PIXELS = 16_000_000
export const CARD_ART_FILE_NAME = /^[a-z0-9][a-z0-9_-]{0,39}\.png$/i
const CARD_ART_FILE_NAME_MESSAGE = 'Art file names use letters, numbers, dashes or underscores and end in .png'

const ArtLayerSchema = z.object({
    kind: z.literal('art'),
    src: z.string().regex(CARD_ART_FILE_NAME, CARD_ART_FILE_NAME_MESSAGE),
    ...Box,
})

const ImageLayerSchema = z.object({
    kind: z.literal('image'),
    field: z.enum(CARD_IMAGE_FIELDS),
    fit: z.enum(['contain', 'cover']).default('contain'),
    ...Box,
})

const TextLayerSchema = z.object({
    kind: z.literal('text'),
    field: z.enum(CARD_TEXT_FIELDS),
    size: z.number().positive(),
    minSize: z.number().positive().optional(),
    color: z.string().default('#ffffff'),
    text: z.string().max(60, 'Custom text must be 60 characters or fewer').optional(),
    uppercase: z.boolean().default(false),
    letterSpacing: z.number().default(0),
    ...Box,
})

const StatsLayerSchema = z.object({
    kind: z.literal('stats'),
    size: z.number().positive(),
    minSize: z.number().positive().optional(),
    color: z.string().default('#ffffff'),
    letterSpacing: z.number().default(0),
    ...Box,
})

export const CardLayerSchema = z.discriminatedUnion('kind', [ArtLayerSchema, ImageLayerSchema, TextLayerSchema, StatsLayerSchema])
export type CardLayer = z.infer<typeof CardLayerSchema>
export type CardArtLayer = z.infer<typeof ArtLayerSchema>
export type CardImageLayer = z.infer<typeof ImageLayerSchema>
export type CardTextLayer = z.infer<typeof TextLayerSchema>
export type CardStatsLayer = z.infer<typeof StatsLayerSchema>

export const CardLayersSchema = z.array(CardLayerSchema).min(1, 'Template has no layers').superRefine((layers, ctx) => {
    layers.forEach((layer, i) => {
        if (layer.kind === 'text' && layer.field === 'custom' && !layer.text?.trim()) {
            ctx.addIssue({ code: 'custom', path: [i, 'text'], message: 'Custom text cannot be blank' })
        }
    })
})

export const PlayerCardsQuerySchema = z.object({
    playerId: z.string().uuid(),
    seasonNumber: z.number().int('Season must be a whole number').min(1, 'Season must be at least 1'),
})
export type PlayerCardsQueryInput = z.infer<typeof PlayerCardsQuerySchema>

const Rating = z.number().int('Ratings must be whole numbers').min(1, 'Ratings must be at least 1').max(99, 'Ratings must be 99 or lower')

export const CardOverridesSchema = z.object({
    username: z.string().trim().min(1, 'Name cannot be blank').max(40, 'Name must be 40 characters or fewer').optional(),
    ovr: Rating.optional(),
    position: z.enum(CARD_POSITIONS).optional(),
    attributes: z.object({
        scoring: Rating.optional(),
        spiking: Rating.optional(),
        setting: Rating.optional(),
        blocking: Rating.optional(),
        receiving: Rating.optional(),
        serving: Rating.optional(),
    }).optional(),
})
export type CardOverrides = z.infer<typeof CardOverridesSchema>

export const DeletePlayerCardSchema = PlayerCardsQuerySchema.extend({ groupId: z.string().uuid() })
export type DeletePlayerCardInput = z.infer<typeof DeletePlayerCardSchema>

export const GeneratePlayerCardSchema = PlayerCardsQuerySchema.extend({
    groupId: z.string().uuid(),
    overrides: CardOverridesSchema.optional(),
})
export type GeneratePlayerCardInput = z.infer<typeof GeneratePlayerCardSchema>

export const PreviewPlayerCardSchema = PlayerCardsQuerySchema.extend({
    templateId: z.string().uuid(),
    layers: CardLayersSchema,
    overrides: CardOverridesSchema.optional(),
})
export type PreviewPlayerCardInput = z.infer<typeof PreviewPlayerCardSchema>

export function hasPinnedArt(layers: CardLayer[]): boolean {
    return layers[0]?.kind === 'art' && layers.filter(layer => layer.kind === 'art').length === 1
}

export const UpdateCardGroupLayersSchema = z.object({
    groupId: z.string().uuid(),
    layers: CardLayersSchema.refine(hasPinnedArt, 'A layout needs exactly one art layer, at the bottom'),
})
export type UpdateCardGroupLayersInput = z.infer<typeof UpdateCardGroupLayersSchema>

const CustomCardPlayerSchema = z.object({
    robloxUserId: z.string().regex(/^\d+$/, 'Invalid Roblox user id'),
    username: z.string().trim().min(1, 'Player name is required').max(64),
    displayName: z.string().max(64).nullable(),
    avatarUrl: z.string().max(2048).nullable(),
})
export type CustomCardPlayer = z.infer<typeof CustomCardPlayerSchema>

export const CustomCardValuesSchema = z.object({
    ovr: Rating,
    position: z.string().trim().max(3, 'Position must be 3 characters or fewer'),
    attributes: z.object({
        scoring: Rating,
        spiking: Rating,
        setting: Rating,
        blocking: Rating,
        receiving: Rating,
        serving: Rating,
    }),
})
export type CustomCardValues = z.infer<typeof CustomCardValuesSchema>

const CustomCardBaseSchema = z.object({
    seasonNumber: z.number().int('Season must be a whole number').min(1, 'Season must be at least 1'),
    regionCode: z.string().trim().min(1).max(8).nullable(),
    player: CustomCardPlayerSchema,
    values: CustomCardValuesSchema,
})

export const GenerateCustomPlayerCardSchema = CustomCardBaseSchema.extend({ groupId: z.string().uuid() })
export type GenerateCustomPlayerCardInput = z.infer<typeof GenerateCustomPlayerCardSchema>

export const PreviewCustomPlayerCardSchema = CustomCardBaseSchema.extend({
    templateId: z.string().uuid(),
    layers: CardLayersSchema,
})
export type PreviewCustomPlayerCardInput = z.infer<typeof PreviewCustomPlayerCardSchema>

export const UploadPlayerCardGfxSchema = z.discriminatedUnion('kind', [
    PlayerCardsQuerySchema.extend({ kind: z.literal('board'), groupId: z.string().uuid(), overrides: CardOverridesSchema.optional() }),
    CustomCardBaseSchema.extend({ kind: z.literal('custom'), groupId: z.string().uuid() }),
])
export type UploadPlayerCardGfxInput = z.infer<typeof UploadPlayerCardGfxSchema>

const CanvasSide = z.number({ error: 'Canvas sides must be numbers' }).int('Canvas sides must be whole numbers').min(100, 'Canvas sides must be at least 100px').max(4000, 'Canvas sides must be 4000px or less')

const CardGroupFieldsSchema = z.object({
    name: z.string().trim().min(1, 'Group name is required').max(40, 'Group name must be 40 characters or fewer'),
    isActive: z.boolean(),
    sortOrder: z.number({ error: 'Order must be a number' }).int('Order must be a whole number'),
    width: CanvasSide,
    height: CanvasSide,
})

export const CreateCardGroupSchema = CardGroupFieldsSchema
    .omit({ width: true, height: true })
    .extend({ sourceGroupId: z.string().uuid().nullable() })
export type CreateCardGroupInput = z.infer<typeof CreateCardGroupSchema>

export const UpdateCardGroupSchema = CardGroupFieldsSchema.extend({ groupId: z.string().uuid() })
export type UpdateCardGroupInput = z.infer<typeof UpdateCardGroupSchema>

export const CardGroupIdSchema = z.object({ groupId: z.string().uuid() })

const CardTemplateFieldsSchema = z.object({
    name: z.string().trim().min(1, 'Tier name is required').max(40, 'Tier name must be 40 characters or fewer'),
    minOvr: z.number({ error: 'Floor must be between 1 and 99' }).int('Floor must be a whole number').min(1, 'Floor must be between 1 and 99').max(99, 'Floor must be between 1 and 99'),
})

export const CreateCardTemplateSchema = CardTemplateFieldsSchema.extend({ groupId: z.string().uuid() })
export type CreateCardTemplateInput = z.infer<typeof CreateCardTemplateSchema>

export const UpdateCardTemplateSchema = CardTemplateFieldsSchema.extend({ templateId: z.string().uuid() })
export type UpdateCardTemplateInput = z.infer<typeof UpdateCardTemplateSchema>

export const CardTemplateIdSchema = z.object({ templateId: z.string().uuid() })

const BulkSeasonNumber = z.number().int('Season must be a whole number').min(1, 'Season must be at least 1')

export const StartCardBulkSchema = z.object({
    seasonNumber: BulkSeasonNumber,
    regionCode: z.string().trim().min(1).max(8),
    groupId: z.string().uuid(),
    mode: z.enum(['missing', 'all']),
})
export type StartCardBulkInput = z.infer<typeof StartCardBulkSchema>

export const CardBulkJobIdSchema = z.object({ jobId: z.string().uuid() })

export const CardPlayerIdsSchema = z.object({
    seasonNumber: BulkSeasonNumber,
    groupId: z.string().uuid(),
})
export type CardPlayerIdsInput = z.infer<typeof CardPlayerIdsSchema>

export const UploadCardArtSchema = z.object({
    templateId: z.string().uuid(),
    fileName: z.string().regex(CARD_ART_FILE_NAME, CARD_ART_FILE_NAME_MESSAGE),
})
export type UploadCardArtInput = z.infer<typeof UploadCardArtSchema>
