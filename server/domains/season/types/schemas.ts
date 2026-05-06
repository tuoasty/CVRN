import {z} from "zod"

export const SeasonIdSchema = z.object({
    seasonId: z.uuid(),
})
export type SeasonIdInput = z.infer<typeof SeasonIdSchema>

export const SeasonSlugRegionSchema = z.object({
    slug: z.string().min(1),
    regionId: z.uuid(),
})
export type SeasonSlugRegionInput = z.infer<typeof SeasonSlugRegionSchema>

export const CreateSeasonSchema = z.object({
    name: z.string().min(1, "Name is required"),
    regionId: z.uuid("Invalid region"),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().nullable().optional(),
    slug: z.string().min(1, "Slug is required"),
    theme: z.string().nullable().optional(),
})
export type CreateSeasonSchemaInput = z.infer<typeof CreateSeasonSchema>

export const UpdateSeasonSchema = z.object({
    seasonId: z.uuid(),
    name: z.string().min(1).optional(),
    startDate: z.string().optional(),
    endDate: z.string().nullable().optional(),
    isActive: z.boolean().optional(),
    slug: z.string().min(1).optional(),
    theme: z.string().nullable().optional(),
})
export type UpdateSeasonSchemaInput = z.infer<typeof UpdateSeasonSchema>
