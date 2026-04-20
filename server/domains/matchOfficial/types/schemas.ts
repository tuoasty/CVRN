import {z} from "zod"

export const OfficialTypeSchema = z.enum(["referee", "media"])
export type OfficialType = z.infer<typeof OfficialTypeSchema>

export const AssignOfficialSchema = z.object({
    matchId: z.uuid(),
    officialId: z.uuid(),
    officialType: OfficialTypeSchema,
})
export type AssignOfficialInput = z.infer<typeof AssignOfficialSchema>

export const AssignMultipleOfficialsSchema = z.object({
    matchId: z.uuid(),
    officialIds: z.array(z.uuid()),
    officialType: OfficialTypeSchema,
})
export type AssignMultipleOfficialsInput = z.infer<typeof AssignMultipleOfficialsSchema>
