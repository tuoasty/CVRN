import {z} from "zod"

export const GetTeamByNameSeasonSchema = z.object({
    name: z.string().min(1),
    seasonId: z.uuid(),
})
export type GetTeamByNameSeason = z.infer<typeof GetTeamByNameSeasonSchema>

export const TeamIdSchema = z.object({
    teamId: z.uuid(),
})
export type TeamIdInput = z.infer<typeof TeamIdSchema>

export const TeamSlugSeasonSchema = z.object({
    slug: z.string().min(1),
    seasonId: z.uuid(),
})
export type TeamSlugSeasonInput = z.infer<typeof TeamSlugSeasonSchema>

export const CreateTeamFormSchema = z.object({
    name: z.string().min(1),
    seasonId: z.uuid(),
    brickNumber: z.coerce.number().int().positive(),
    brickColor: z.string().min(1),
    startingLvr: z.coerce.number(),
})
export type CreateTeamFormInput = z.infer<typeof CreateTeamFormSchema>

export const UpdateTeamFormSchema = z.object({
    teamId: z.uuid(),
    name: z.string().min(1),
    brickNumber: z.coerce.number().int().positive(),
    brickColor: z.string().min(1),
    startingLvr: z.coerce.number(),
})
export type UpdateTeamFormInput = z.infer<typeof UpdateTeamFormSchema>
