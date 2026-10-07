import { z } from "zod"

export const UPDATE_LOG_VERSION_PATTERN = /^[A-Za-z0-9._-]{1,32}$/

const UpdateLogFieldsSchema = z.object({
    version:    z.string().trim().regex(UPDATE_LOG_VERSION_PATTERN, 'Version may only use letters, numbers, dots, dashes and underscores (max 32)'),
    title:      z.string().trim().max(120, 'Title must be 120 characters or fewer').optional().or(z.literal('')),
    body:       z.string().trim().min(1, 'Body is required'),
    releasedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Release date is required'),
})

export const CreateUpdateLogFormSchema = UpdateLogFieldsSchema
export type CreateUpdateLogFormInput = z.infer<typeof CreateUpdateLogFormSchema>

export const UpdateUpdateLogFormSchema = UpdateLogFieldsSchema.extend({
    updateLogId: z.string().uuid(),
})
export type UpdateUpdateLogFormInput = z.infer<typeof UpdateUpdateLogFormSchema>

export const UpdateLogIdSchema = z.object({ updateLogId: z.string().uuid() })
export type UpdateLogIdInput = z.infer<typeof UpdateLogIdSchema>

export const SetUpdateLogPublishedSchema = z.object({
    updateLogId: z.string().uuid(),
    published:   z.boolean(),
})
export type SetUpdateLogPublishedInput = z.infer<typeof SetUpdateLogPublishedSchema>
