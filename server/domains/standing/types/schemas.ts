import {z} from "zod"

export const GetStandingsSchema = z.object({
    seasonId: z.string().uuid().optional(),
    regionId: z.string().uuid().optional(),
    sortMode: z.enum(["lvr", "wins"]).optional(),
})
export type GetStandingsInput = z.infer<typeof GetStandingsSchema>
