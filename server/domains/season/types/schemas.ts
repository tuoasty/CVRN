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
export const LeagueTypeEnum = z.enum(['main', 'side']);

export const SeasonNumberQuerySchema = z.object({
    season: z.union([z.literal("current"), z.coerce.number().int().min(1)]),
})
export type SeasonNumberQueryInput = z.infer<typeof SeasonNumberQuerySchema>

export const CreateSeasonSchema = z.object({
    name: z.string().min(1, "Name is required"),
    regionId: z.uuid("Invalid region"),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().nullable().optional(),
    slug: z.string().min(1, "Slug is required"),
    seasonNumber: z.coerce.number().int().min(1, "Season number is required"),
    leagueType: LeagueTypeEnum.default('main'),
    theme: z.string().nullable().optional(),
    maxPlayers: z.coerce.number().int().min(3).default(18),
    playoffConfigId: z.uuid("Invalid playoff config").nullable().optional()
})
export type CreateSeasonSchemaInput = z.infer<typeof CreateSeasonSchema>

export const UpdateSeasonSchema = z.object({
    seasonId: z.uuid(),
    name: z.string().min(1).optional(),
    startDate: z.string().optional(),
    endDate: z.string().nullable().optional(),
    slug: z.string().min(1).optional(),
    seasonNumber: z.coerce.number().int().min(1).optional(),
    leagueType: LeagueTypeEnum.optional(),
    theme: z.string().nullable().optional(),
    maxPlayers: z.coerce.number().int().min(3).optional(),
    playoffConfigId: z.uuid("Invalid playoff config").nullable().optional()
})
export type UpdateSeasonSchemaInput = z.infer<typeof UpdateSeasonSchema>

export const UpsertSeasonPodiumSlotSchema = z.object({
    seasonId: z.uuid(),
    place: z.number().int().min(1).max(8),
    teamId: z.uuid(),
    isOverride: z.boolean().default(false),
    notes: z.string().nullable().optional(),
})
export type UpsertSeasonPodiumSlotInput = z.infer<typeof UpsertSeasonPodiumSlotSchema>

export const DeleteSeasonPodiumSlotSchema = z.object({
    seasonId: z.uuid(),
    teamId: z.uuid(),
})
export type DeleteSeasonPodiumSlotInput = z.infer<typeof DeleteSeasonPodiumSlotSchema>

export const DeriveSeasonPodiumSchema = z.object({
    seasonId: z.uuid(),
})
export type DeriveSeasonPodiumInput = z.infer<typeof DeriveSeasonPodiumSchema>

export const AwardCategoryEnum = z.enum(["individual_winners", "first_team", "staff_team", "champion_roster"]);
export type AwardCategory = z.infer<typeof AwardCategoryEnum>;

export const UpsertSeasonAwardSchema = z.object({
    seasonId: z.uuid(),
    playerId: z.uuid(),
    awardName: z.string().min(1, "Award name is required"),
    category: AwardCategoryEnum,
    cdnUrl: z.string().url("Invalid avatar URL"),
})
export type UpsertSeasonAwardInput = z.infer<typeof UpsertSeasonAwardSchema>

export const DeleteSeasonAwardSchema = z.object({
    awardId: z.uuid(),
})
export type DeleteSeasonAwardInput = z.infer<typeof DeleteSeasonAwardSchema>

export const BatchUpsertSeasonAwardsSchema = z.object({
    seasonId: z.uuid(),
    awards: z.array(z.object({
        playerId: z.uuid(),
        awardName: z.string().min(1, "Award name is required"),
        category: AwardCategoryEnum,
    })).min(1, "Add at least one award"),
})
export type BatchUpsertSeasonAwardsInput = z.infer<typeof BatchUpsertSeasonAwardsSchema>

export const UpdateSeasonAwardSchema = z.object({
    awardId: z.uuid(),
    awardName: z.string().min(1, "Award name is required"),
})
export type UpdateSeasonAwardInput = z.infer<typeof UpdateSeasonAwardSchema>

export const ReorderSeasonAwardsSchema = z.object({
    updates: z.array(z.object({
        id: z.uuid(),
        sortOrder: z.number().int().min(0),
    })).min(1),
})
export type ReorderSeasonAwardsInput = z.infer<typeof ReorderSeasonAwardsSchema>
