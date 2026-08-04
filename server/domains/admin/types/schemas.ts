import {z} from "zod"

export const InviteUserSchema = z.object({
    email: z.email(),
    role: z.enum(["super_admin", "admin", "stat_tracker", "staff", "spec_manager"]),
})
export type InviteUserInput = z.infer<typeof InviteUserSchema>
export type InvitableRole = InviteUserInput["role"]
