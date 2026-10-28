import { z } from "zod"

export const CARD_TEXT_FIELDS = [
    'username', 'displayName', 'ovr', 'position', 'teamName',
    'scoring', 'spiking', 'setting', 'blocking', 'receiving', 'serving',
] as const

export const CARD_IMAGE_FIELDS = ['headshot', 'teamLogo'] as const

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
    color: z.string().default('#ffffff'),
    align: z.enum(['left', 'center', 'right']).default('left'),
    uppercase: z.boolean().default(false),
    letterSpacing: z.number().default(0),
    ...Box,
})

export const CardLayerSchema = z.discriminatedUnion('kind', [ArtLayerSchema, ImageLayerSchema, TextLayerSchema])
export type CardLayer = z.infer<typeof CardLayerSchema>
export type CardArtLayer = z.infer<typeof ArtLayerSchema>
export type CardImageLayer = z.infer<typeof ImageLayerSchema>
export type CardTextLayer = z.infer<typeof TextLayerSchema>

export const CardLayersSchema = z.array(CardLayerSchema).min(1, 'Template has no layers')

export const PlayerCardsQuerySchema = z.object({
    playerId: z.string().uuid(),
    seasonNumber: z.number().int('Season must be a whole number').min(1, 'Season must be at least 1'),
})
export type PlayerCardsQueryInput = z.infer<typeof PlayerCardsQuerySchema>

export const GeneratePlayerCardSchema = PlayerCardsQuerySchema.extend({
    groupId: z.string().uuid(),
})
export type GeneratePlayerCardInput = z.infer<typeof GeneratePlayerCardSchema>
