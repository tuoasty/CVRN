import { z } from "zod"

export const CARD_TEXT_FIELDS = [
    'username', 'displayName', 'ovr', 'position', 'teamName',
    'scoring', 'spiking', 'setting', 'blocking', 'receiving', 'serving',
    'custom',
] as const

export const CARD_STAT_FIELDS = ['scoring', 'spiking', 'setting', 'blocking', 'receiving', 'serving'] as const
export type CardStatField = typeof CARD_STAT_FIELDS[number]

export const CARD_STAT_ORDERS = ['valueFirst', 'labelFirst'] as const
export type CardStatOrder = typeof CARD_STAT_ORDERS[number]

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

const ArtLayerSchema = z.object({
    kind: z.literal('art'),
    src: z.string().min(1),
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
    statOrder: z.enum(CARD_STAT_ORDERS).default('valueFirst'),
    uppercase: z.boolean().default(false),
    letterSpacing: z.number().default(0),
    ...Box,
})

export const CardLayerSchema = z.discriminatedUnion('kind', [ArtLayerSchema, ImageLayerSchema, TextLayerSchema])
export type CardLayer = z.infer<typeof CardLayerSchema>
export type CardArtLayer = z.infer<typeof ArtLayerSchema>
export type CardImageLayer = z.infer<typeof ImageLayerSchema>
export type CardTextLayer = z.infer<typeof TextLayerSchema>

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

export const UpdateCardTemplateLayersSchema = z.object({
    templateId: z.string().uuid(),
    layers: CardLayersSchema,
})
export type UpdateCardTemplateLayersInput = z.infer<typeof UpdateCardTemplateLayersSchema>
