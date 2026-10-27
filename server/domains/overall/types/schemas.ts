import { z } from "zod"

const POSITIONS = ['OUT', 'OPP', 'MID', 'SET', 'LIB'] as const

export const SeasonIdSchema = z.object({ seasonId: z.string().uuid() })
export type SeasonIdInput = z.infer<typeof SeasonIdSchema>

export const WEIGHT_TOTAL = 100

const WeightSchema = z.number().int('Weights must be whole numbers').min(0, 'Weights cannot be negative').max(WEIGHT_TOTAL)

export const OverallScalingSchema = z.object({
    position: z.enum(POSITIONS),
    weights: z.object({
        scoring:   WeightSchema,
        spiking:   WeightSchema,
        setting:   WeightSchema,
        blocking:  WeightSchema,
        receiving: WeightSchema,
        serving:   WeightSchema,
    }),
    floor: z.number().min(1, 'Floor must be at least 1').max(98),
    ceil:  z.number().min(2).max(99, 'Ceiling must be 99 or lower'),
    curve: z.number().min(0.2, 'Curve must be at least 0.2').max(5, 'Curve must be 5 or lower'),
})
    .refine(s => s.floor < s.ceil, { message: 'Floor must be below the ceiling' })
    .refine(s => Object.values(s.weights).reduce((sum, w) => sum + w, 0) === WEIGHT_TOTAL, { message: `Weights must add up to ${WEIGHT_TOTAL}` })

export const SaveOverallScalingsSchema = z.object({
    seasonId: z.string().uuid(),
    scalings: z.array(OverallScalingSchema).min(1).max(POSITIONS.length)
        .refine(list => new Set(list.map(s => s.position)).size === list.length, { message: 'Each position can only appear once' }),
})
export type SaveOverallScalingsInput = z.infer<typeof SaveOverallScalingsSchema>

export const CopyOverallScalingsSchema = z.object({
    seasonId:     z.string().uuid(),
    fromSeasonId: z.string().uuid(),
}).refine(v => v.seasonId !== v.fromSeasonId, { message: 'Pick a different season to copy from' })
export type CopyOverallScalingsInput = z.infer<typeof CopyOverallScalingsSchema>

export const SetOverallOverrideSchema = z.object({
    seasonId: z.string().uuid(),
    playerId: z.string().uuid(),
    overall:  z.number().int('Overall must be a whole number').min(1, 'Overall must be at least 1').max(99, 'Overall must be 99 or lower'),
})
export type SetOverallOverrideInput = z.infer<typeof SetOverallOverrideSchema>

export const ClearOverallOverrideSchema = z.object({
    seasonId: z.string().uuid(),
    playerId: z.string().uuid(),
})
export type ClearOverallOverrideInput = z.infer<typeof ClearOverallOverrideSchema>
