import {z} from "zod"

export const GetStandingsSchema = z.object({
    seasonId: z.uuid().optional(),
    regionId: z.uuid().optional(),
})
export type GetStandingsInput = z.infer<typeof GetStandingsSchema>
