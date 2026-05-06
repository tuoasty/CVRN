import {z} from "zod"

export const SaveOfficialSchema = z.object({
    robloxUserId: z.string().min(1),
    username: z.string().min(1),
    displayName: z.string().nullish(),
    avatarUrl: z.string().nullish(),
})
export type SaveOfficialInput = z.infer<typeof SaveOfficialSchema>

export const SearchOfficialsSchema = z.object({
    query: z.string().min(1),
})
export type SearchOfficialsInput = z.infer<typeof SearchOfficialsSchema>
