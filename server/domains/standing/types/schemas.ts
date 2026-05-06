import {z} from "zod"

export const GetStandingsSchema = z.object({
    seasonId: z.uuid().optional(),
    regionId: z.uuid().optional(),
    sortMode: z.enum(["lvr", "wins"]).optional(),
})
export type GetStandingsInput = z.infer<typeof GetStandingsSchema>
