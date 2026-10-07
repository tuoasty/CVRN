import { z } from "zod"
import { isValidImageName, IMAGE_NAME_MAX, IMAGE_MAX_BYTES } from "@/shared/utils/imageTokens"

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

export const UPDATE_LOG_IMAGE_MAX_BYTES = IMAGE_MAX_BYTES

const ImageNameSchema = z.string().trim().refine(isValidImageName, `Image names use lowercase letters, numbers and single dashes (max ${IMAGE_NAME_MAX})`)
const CaptionSchema = z.string().trim().max(200, 'Captions must be 200 characters or fewer')

export const UploadUpdateLogImageFormSchema = z.object({
    updateLogId: z.string().uuid(),
    name:        ImageNameSchema,
    caption:     CaptionSchema,
})
export type UploadUpdateLogImageFormInput = z.infer<typeof UploadUpdateLogImageFormSchema>

export const UpdateUpdateLogImagesSchema = z.object({
    updateLogId: z.string().uuid(),
    changes: z.array(z.object({
        id:      z.string().uuid(),
        name:    ImageNameSchema,
        caption: CaptionSchema.nullable(),
    })).max(200),
    removedIds: z.array(z.string().uuid()).max(200),
})
export type UpdateUpdateLogImagesFormInput = z.infer<typeof UpdateUpdateLogImagesSchema>
