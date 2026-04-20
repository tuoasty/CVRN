import {z} from "zod"

export const CreateMatchSchema = z.object({
    homeId: z.uuid(),
    awayId: z.uuid(),
    scheduledDate: z.string().optional(),
    scheduledTime: z.string().optional(),
    timezone: z.string().optional(),
})
export type CreateMatchInput = z.infer<typeof CreateMatchSchema>

export const CreateMatchesSchema = z.object({
    seasonId: z.uuid(),
    week: z.number().int().positive(),
    defaultScheduledDate: z.string().optional(),
    defaultScheduledTime: z.string().optional(),
    defaultTimezone: z.string().optional(),
    matches: z.array(CreateMatchSchema),
})
export type CreateMatchesInput = z.infer<typeof CreateMatchesSchema>

export const CompleteMatchSchema = z.object({
    matchId: z.uuid(),
    sets: z.array(z.object({
        setNumber: z.number().int().positive(),
        homeScore: z.number().int().nonnegative(),
        awayScore: z.number().int().nonnegative(),
    })),
    matchMvpPlayerId: z.uuid().nullish(),
    loserMvpPlayerId: z.uuid().nullish(),
    scheduledDate: z.string().nullish(),
    scheduledTime: z.string().nullish(),
    timezone: z.string().nullish(),
    isForfeit: z.boolean().optional(),
    forfeitingTeam: z.enum(["home", "away"]).optional(),
})
export type CompleteMatchInput = z.infer<typeof CompleteMatchSchema>

export const VoidMatchSchema = z.object({
    matchId: z.uuid(),
})
export type VoidMatchInput = z.infer<typeof VoidMatchSchema>

export const UpdateMatchScheduleSchema = z.object({
    matchId: z.uuid(),
    scheduledDate: z.string().nullish(),
    scheduledTime: z.string().nullish(),
    timezone: z.string().nullish(),
})
export type UpdateMatchScheduleInput = z.infer<typeof UpdateMatchScheduleSchema>

export const MatchIdSchema = z.object({
    matchId: z.uuid(),
})
export type MatchIdInput = z.infer<typeof MatchIdSchema>

export const MatchSetsSchema = z.object({
    matchId: z.uuid(),
})
export type MatchSetsInput = z.infer<typeof MatchSetsSchema>
