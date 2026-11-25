import {z} from "zod"

export const BoosterListResponseSchema = z.object({
    roblox_user_ids: z.array(z.string()),
})
export type BoosterListResponse = z.infer<typeof BoosterListResponseSchema>
