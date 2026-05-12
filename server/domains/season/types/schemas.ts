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

export const UpsertSeasonPodiumSlotSchema = z.object({
    seasonId: z.uuid(),
    place: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    teamId: z.uuid(),
    isOverride: z.boolean().default(false),
    notes: z.string().nullable().optional(),
})
export type UpsertSeasonPodiumSlotInput = z.infer<typeof UpsertSeasonPodiumSlotSchema>

export const DeleteSeasonPodiumSlotSchema = z.object({
    seasonId: z.uuid(),
    place: z.union([z.literal(1), z.literal(2), z.literal(3)]),
})
export type DeleteSeasonPodiumSlotInput = z.infer<typeof DeleteSeasonPodiumSlotSchema>

export const DeriveSeasonPodiumSchema = z.object({
    seasonId: z.uuid(),
})
export type DeriveSeasonPodiumInput = z.infer<typeof DeriveSeasonPodiumSchema>

export const UpsertSeasonAwardSchema = z.object({
    seasonId: z.uuid(),
    playerId: z.uuid(),
    awardName: z.string().min(1, "Award name is required"),
})
export type UpsertSeasonAwardInput = z.infer<typeof UpsertSeasonAwardSchema>

export const DeleteSeasonAwardSchema = z.object({
    awardId: z.uuid(),
})
export type DeleteSeasonAwardInput = z.infer<typeof DeleteSeasonAwardSchema>
