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
