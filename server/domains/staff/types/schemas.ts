import {z} from "zod"
import {ACCESS_GROUPS} from "@/shared/types/accessGroup"

const GroupListSchema = z.array(z.enum(ACCESS_GROUPS)).max(ACCESS_GROUPS.length)

export const SetRoleGroupsSchema = z.object({
    roleId: z.string().regex(/^\d{1,25}$/, "Invalid Discord role ID"),
    groups: GroupListSchema,
})
export type SetRoleGroupsInput = z.infer<typeof SetRoleGroupsSchema>

export const SaveRoleMappingSchema = z.object({
    changes: z.array(SetRoleGroupsSchema).min(1).max(500),
})
export type SaveRoleMappingInput = z.infer<typeof SaveRoleMappingSchema>

export const SetUserBlocksSchema = z.object({
    userId:  z.string().uuid(),
    blocked: z.union([GroupListSchema, z.literal("all"), z.null()]),
})
export type SetUserBlocksInput = z.infer<typeof SetUserBlocksSchema>
