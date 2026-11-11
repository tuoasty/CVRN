import {z} from "zod"

export const GetAuditLogSchema = z.object({
    before:  z.number().int().positive().optional(),
    userId:  z.uuid().optional(),
    action:  z.string().max(60).regex(/^[A-Za-z ]*$/, "Search by action name").optional(),
    kind:    z.enum(["action", "auth"]).optional(),
    outcome: z.enum(["allowed", "denied"]).optional(),
})
export type GetAuditLogInput = z.infer<typeof GetAuditLogSchema>
